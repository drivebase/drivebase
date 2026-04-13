package local

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"os"
	"path/filepath"
	"testing"

	"github.com/drivebase/drivebase/internal/storage"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestProvider(t *testing.T) *localProvider {
	t.Helper()
	dir := t.TempDir()
	creds, _ := json.Marshal(Credentials{BasePath: dir})
	p, err := New(creds)
	require.NoError(t, err)
	return p
}

func TestValidate(t *testing.T) {
	p := newTestProvider(t)
	require.NoError(t, p.Validate(context.Background()))
}

func TestValidate_missingDir(t *testing.T) {
	creds, _ := json.Marshal(Credentials{BasePath: "/tmp/drivebase-nonexistent-dir-xyz"})
	p, err := New(creds)
	require.NoError(t, err)
	require.Error(t, p.Validate(context.Background()))
}

func TestList_empty(t *testing.T) {
	p := newTestProvider(t)
	result, err := p.List(context.Background(), storage.ListOptions{})
	require.NoError(t, err)
	assert.Empty(t, result.Files)
}

func TestUploadAndList(t *testing.T) {
	p := newTestProvider(t)
	ctx := context.Background()

	content := []byte("hello drivebase")
	fi, err := p.Upload(ctx, storage.UploadParams{
		ParentID: "",
		Name:     "test.txt",
		Body:     bytes.NewReader(content),
	})
	require.NoError(t, err)
	assert.Equal(t, "test.txt", fi.Name)
	assert.Equal(t, int64(len(content)), fi.Size)
	assert.False(t, fi.IsDir)

	result, err := p.List(ctx, storage.ListOptions{})
	require.NoError(t, err)
	require.Len(t, result.Files, 1)
	assert.Equal(t, "test.txt", result.Files[0].Name)
}

func TestDownload(t *testing.T) {
	p := newTestProvider(t)
	ctx := context.Background()

	content := []byte("download me")
	fi, err := p.Upload(ctx, storage.UploadParams{Name: "dl.txt", Body: bytes.NewReader(content)})
	require.NoError(t, err)

	rc, info, err := p.Download(ctx, fi.RemoteID)
	require.NoError(t, err)
	defer rc.Close()

	got, err := io.ReadAll(rc)
	require.NoError(t, err)
	assert.Equal(t, content, got)
	assert.Equal(t, "dl.txt", info.Name)
}

func TestCreateFolder(t *testing.T) {
	p := newTestProvider(t)
	ctx := context.Background()

	fi, err := p.CreateFolder(ctx, "", "myfolder")
	require.NoError(t, err)
	assert.Equal(t, "myfolder", fi.Name)
	assert.True(t, fi.IsDir)

	// List root — should see the folder
	result, err := p.List(ctx, storage.ListOptions{})
	require.NoError(t, err)
	require.Len(t, result.Files, 1)
	assert.True(t, result.Files[0].IsDir)
}

func TestRename(t *testing.T) {
	p := newTestProvider(t)
	ctx := context.Background()

	fi, _ := p.Upload(ctx, storage.UploadParams{Name: "old.txt", Body: bytes.NewReader([]byte("x"))})
	renamed, err := p.Rename(ctx, fi.RemoteID, "new.txt")
	require.NoError(t, err)
	assert.Equal(t, "new.txt", renamed.Name)

	// Old path should be gone
	_, err = p.GetFile(ctx, fi.RemoteID)
	assert.ErrorIs(t, err, storage.ErrNotFound)
}

func TestMove(t *testing.T) {
	p := newTestProvider(t)
	ctx := context.Background()

	p.CreateFolder(ctx, "", "dst")
	fi, _ := p.Upload(ctx, storage.UploadParams{Name: "file.txt", Body: bytes.NewReader([]byte("x"))})

	moved, err := p.Move(ctx, fi.RemoteID, "dst")
	require.NoError(t, err)
	assert.Equal(t, "dst", moved.ParentID)
}

func TestCopy(t *testing.T) {
	p := newTestProvider(t)
	ctx := context.Background()

	p.CreateFolder(ctx, "", "dst")
	content := []byte("copy me")
	fi, _ := p.Upload(ctx, storage.UploadParams{Name: "orig.txt", Body: bytes.NewReader(content)})

	copied, err := p.Copy(ctx, fi.RemoteID, "dst")
	require.NoError(t, err)
	assert.Equal(t, "orig.txt", copied.Name)

	// Original still exists
	_, err = p.GetFile(ctx, fi.RemoteID)
	require.NoError(t, err)

	// Copy exists in dst
	rc, _, err := p.Download(ctx, copied.RemoteID)
	require.NoError(t, err)
	defer rc.Close()
	got, _ := io.ReadAll(rc)
	assert.Equal(t, content, got)
}

func TestDelete(t *testing.T) {
	p := newTestProvider(t)
	ctx := context.Background()

	fi, _ := p.Upload(ctx, storage.UploadParams{Name: "del.txt", Body: bytes.NewReader([]byte("x"))})
	require.NoError(t, p.Delete(ctx, fi.RemoteID))

	_, err := p.GetFile(ctx, fi.RemoteID)
	assert.ErrorIs(t, err, storage.ErrNotFound)
}

func TestPathTraversal(t *testing.T) {
	p := newTestProvider(t)
	ctx := context.Background()

	// Attempt to read a file outside base path
	_, err := p.GetFile(ctx, "../../etc/passwd")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "path traversal")
}

func TestGenerateTempLink_notSupported(t *testing.T) {
	p := newTestProvider(t)
	_, err := p.GenerateTempLink(context.Background(), "any", 0)
	assert.ErrorIs(t, err, storage.ErrNotSupported)
}

func TestGetQuota(t *testing.T) {
	p := newTestProvider(t)

	qp, ok := storage.Provider(p).(storage.QuotaProvider)
	require.True(t, ok, "localProvider should implement QuotaProvider")

	info, err := qp.GetQuota(context.Background())
	require.NoError(t, err)
	assert.Greater(t, info.TotalBytes, int64(0))
	assert.GreaterOrEqual(t, info.FreeBytes, int64(0))
	assert.Equal(t, "Local Disk", info.PlanName)
}

func TestUpload_nestedFolder(t *testing.T) {
	p := newTestProvider(t)
	ctx := context.Background()

	// Create nested folder
	_, err := p.CreateFolder(ctx, "", "a")
	require.NoError(t, err)
	_, err = p.CreateFolder(ctx, "a", "b")
	require.NoError(t, err)

	// Upload into nested folder
	fi, err := p.Upload(ctx, storage.UploadParams{
		ParentID: filepath.Join("a", "b"),
		Name:     "deep.txt",
		Body:     bytes.NewReader([]byte("deep")),
	})
	require.NoError(t, err)
	assert.Equal(t, "deep.txt", fi.Name)

	// Check it exists on disk
	absPath := filepath.Join(p.basePath, "a", "b", "deep.txt")
	_, err = os.Stat(absPath)
	require.NoError(t, err)
}
