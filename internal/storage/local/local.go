package local

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/drivebase/drivebase/internal/storage"
)

func init() {
	storage.Register(storage.ProviderTypeLocal, func(creds storage.Credentials) (storage.Provider, error) {
		return New(creds)
	})
}

// Credentials holds the configuration for the local filesystem provider.
type Credentials struct {
	BasePath string `json:"base_path"`
}

type localProvider struct {
	basePath string
}

// New creates a local filesystem provider rooted at the path in creds.
func New(creds storage.Credentials) (*localProvider, error) {
	var c Credentials
	if err := json.Unmarshal(creds, &c); err != nil {
		return nil, fmt.Errorf("local: invalid credentials: %w", err)
	}
	if c.BasePath == "" {
		return nil, fmt.Errorf("local: base_path is required")
	}
	abs, err := filepath.Abs(c.BasePath)
	if err != nil {
		return nil, fmt.Errorf("local: invalid base_path: %w", err)
	}
	return &localProvider{basePath: abs}, nil
}

func (p *localProvider) Type() storage.ProviderType { return storage.ProviderTypeLocal }

// GetQuota returns disk usage stats for the volume containing basePath.
func (p *localProvider) GetQuota(_ context.Context) (*storage.QuotaInfo, error) {
	var stat syscall.Statfs_t
	if err := syscall.Statfs(p.basePath, &stat); err != nil {
		return nil, fmt.Errorf("local: statfs: %w", err)
	}
	blockSize := int64(stat.Bsize)
	total := int64(stat.Blocks) * blockSize
	free := int64(stat.Bavail) * blockSize // available to unprivileged processes
	used := total - int64(stat.Bfree)*blockSize

	return &storage.QuotaInfo{
		TotalBytes: total,
		UsedBytes:  used,
		FreeBytes:  free,
		PlanName:   "Local Disk",
		Extra: map[string]any{
			"base_path": p.basePath,
		},
	}, nil
}

func (p *localProvider) Validate(_ context.Context) error {
	info, err := os.Stat(p.basePath)
	if err != nil {
		if os.IsNotExist(err) {
			// Auto-create the directory on first connect
			if mkErr := os.MkdirAll(p.basePath, 0755); mkErr != nil {
				return fmt.Errorf("local: could not create base_path %q: %w", p.basePath, mkErr)
			}
			return nil
		}
		return fmt.Errorf("local: %w", err)
	}
	if !info.IsDir() {
		return fmt.Errorf("local: base_path %q is not a directory", p.basePath)
	}
	return nil
}

func (p *localProvider) List(_ context.Context, opts storage.ListOptions) (*storage.ListResult, error) {
	dir, err := p.safePath(opts.ParentID)
	if err != nil {
		return nil, err
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, storage.ErrNotFound
		}
		return nil, fmt.Errorf("local: %w", err)
	}

	files := make([]storage.FileInfo, 0, len(entries))
	for _, e := range entries {
		info, err := e.Info()
		if err != nil {
			continue
		}
		remoteID := filepath.Join(opts.ParentID, e.Name())
		files = append(files, entryToFileInfo(remoteID, opts.ParentID, info))
	}

	return &storage.ListResult{Files: files}, nil
}

func (p *localProvider) GetFile(_ context.Context, remoteID string) (*storage.FileInfo, error) {
	path, err := p.safePath(remoteID)
	if err != nil {
		return nil, err
	}
	info, err := os.Stat(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, storage.ErrNotFound
		}
		return nil, fmt.Errorf("local: %w", err)
	}
	parentID := filepath.Dir(remoteID)
	if parentID == "." {
		parentID = ""
	}
	fi := entryToFileInfo(remoteID, parentID, info)
	return &fi, nil
}

func (p *localProvider) Upload(_ context.Context, params storage.UploadParams) (*storage.FileInfo, error) {
	destDir, err := p.safePath(params.ParentID)
	if err != nil {
		return nil, err
	}

	destPath := filepath.Join(destDir, params.Name)
	f, err := os.Create(destPath)
	if err != nil {
		return nil, fmt.Errorf("local: create %q: %w", destPath, err)
	}
	defer f.Close()

	if _, err := io.Copy(f, params.Body); err != nil {
		_ = os.Remove(destPath)
		return nil, fmt.Errorf("local: write %q: %w", destPath, err)
	}

	info, err := f.Stat()
	if err != nil {
		return nil, fmt.Errorf("local: stat after upload: %w", err)
	}

	remoteID := filepath.Join(params.ParentID, params.Name)
	fi := entryToFileInfo(remoteID, params.ParentID, info)
	return &fi, nil
}

func (p *localProvider) Download(_ context.Context, remoteID string) (io.ReadCloser, *storage.FileInfo, error) {
	path, err := p.safePath(remoteID)
	if err != nil {
		return nil, nil, err
	}

	f, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil, storage.ErrNotFound
		}
		return nil, nil, fmt.Errorf("local: %w", err)
	}

	info, err := f.Stat()
	if err != nil {
		_ = f.Close()
		return nil, nil, fmt.Errorf("local: stat: %w", err)
	}

	parentID := filepath.Dir(remoteID)
	if parentID == "." {
		parentID = ""
	}
	fi := entryToFileInfo(remoteID, parentID, info)
	return f, &fi, nil
}

func (p *localProvider) Delete(_ context.Context, remoteID string) error {
	path, err := p.safePath(remoteID)
	if err != nil {
		return err
	}
	if err := os.RemoveAll(path); err != nil {
		if os.IsNotExist(err) {
			return storage.ErrNotFound
		}
		return fmt.Errorf("local: delete: %w", err)
	}
	return nil
}

func (p *localProvider) CreateFolder(_ context.Context, parentID, name string) (*storage.FileInfo, error) {
	parentPath, err := p.safePath(parentID)
	if err != nil {
		return nil, err
	}
	dirPath := filepath.Join(parentPath, name)
	if err := os.Mkdir(dirPath, 0755); err != nil {
		if os.IsExist(err) {
			return nil, fmt.Errorf("local: folder %q already exists", name)
		}
		return nil, fmt.Errorf("local: mkdir: %w", err)
	}

	info, err := os.Stat(dirPath)
	if err != nil {
		return nil, fmt.Errorf("local: stat after mkdir: %w", err)
	}

	remoteID := filepath.Join(parentID, name)
	fi := entryToFileInfo(remoteID, parentID, info)
	return &fi, nil
}

func (p *localProvider) Rename(_ context.Context, remoteID, newName string) (*storage.FileInfo, error) {
	oldPath, err := p.safePath(remoteID)
	if err != nil {
		return nil, err
	}

	parentID := filepath.Dir(remoteID)
	if parentID == "." {
		parentID = ""
	}
	newRemoteID := filepath.Join(parentID, newName)

	newPath, err := p.safePath(newRemoteID)
	if err != nil {
		return nil, err
	}

	if err := os.Rename(oldPath, newPath); err != nil {
		return nil, fmt.Errorf("local: rename: %w", err)
	}

	info, err := os.Stat(newPath)
	if err != nil {
		return nil, fmt.Errorf("local: stat after rename: %w", err)
	}

	fi := entryToFileInfo(newRemoteID, parentID, info)
	return &fi, nil
}

func (p *localProvider) Move(_ context.Context, remoteID, newParentID string) (*storage.FileInfo, error) {
	oldPath, err := p.safePath(remoteID)
	if err != nil {
		return nil, err
	}

	name := filepath.Base(remoteID)
	newRemoteID := filepath.Join(newParentID, name)
	newPath, err := p.safePath(newRemoteID)
	if err != nil {
		return nil, err
	}

	if err := os.Rename(oldPath, newPath); err != nil {
		return nil, fmt.Errorf("local: move: %w", err)
	}

	info, err := os.Stat(newPath)
	if err != nil {
		return nil, fmt.Errorf("local: stat after move: %w", err)
	}

	fi := entryToFileInfo(newRemoteID, newParentID, info)
	return &fi, nil
}

func (p *localProvider) Copy(_ context.Context, remoteID, newParentID string) (*storage.FileInfo, error) {
	srcPath, err := p.safePath(remoteID)
	if err != nil {
		return nil, err
	}

	name := filepath.Base(remoteID)
	newRemoteID := filepath.Join(newParentID, name)
	destPath, err := p.safePath(newRemoteID)
	if err != nil {
		return nil, err
	}

	src, err := os.Open(srcPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, storage.ErrNotFound
		}
		return nil, fmt.Errorf("local: open source: %w", err)
	}
	defer src.Close()

	dst, err := os.Create(destPath)
	if err != nil {
		return nil, fmt.Errorf("local: create dest: %w", err)
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		_ = os.Remove(destPath)
		return nil, fmt.Errorf("local: copy: %w", err)
	}

	info, err := dst.Stat()
	if err != nil {
		return nil, fmt.Errorf("local: stat after copy: %w", err)
	}

	parentID := filepath.Dir(newRemoteID)
	if parentID == "." {
		parentID = ""
	}
	fi := entryToFileInfo(newRemoteID, parentID, info)
	return &fi, nil
}

// GenerateTempLink is not supported for local filesystem.
func (p *localProvider) GenerateTempLink(_ context.Context, _ string, _ time.Duration) (string, error) {
	return "", storage.ErrNotSupported
}

// safePath resolves a remoteID relative to basePath and guards against path traversal.
func (p *localProvider) safePath(remoteID string) (string, error) {
	// Empty remoteID = root
	if remoteID == "" {
		return p.basePath, nil
	}

	// Clean the path and join with base
	clean := filepath.Clean(remoteID)
	abs := filepath.Join(p.basePath, clean)

	// Ensure the result is still under basePath
	rel, err := filepath.Rel(p.basePath, abs)
	if err != nil || strings.HasPrefix(rel, "..") {
		return "", fmt.Errorf("local: path traversal detected for %q", remoteID)
	}

	return abs, nil
}

func entryToFileInfo(remoteID, parentID string, info fs.FileInfo) storage.FileInfo {
	return storage.FileInfo{
		RemoteID:   remoteID,
		Name:       info.Name(),
		IsDir:      info.IsDir(),
		Size:       info.Size(),
		ModifiedAt: info.ModTime(),
		ParentID:   parentID,
	}
}
