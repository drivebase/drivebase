package transfer

import (
	"bytes"
	"context"
	"io"
	"testing"
	"time"

	"github.com/drivebase/drivebase/internal/storage"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockProvider is a simple in-memory Provider for testing streaming logic.
type mockProvider struct {
	files map[string][]byte // remoteID → content
}

func newMockProvider() *mockProvider {
	return &mockProvider{files: map[string][]byte{}}
}

func (m *mockProvider) Type() storage.ProviderType { return "mock" }
func (m *mockProvider) Validate(_ context.Context) error { return nil }
func (m *mockProvider) Delete(_ context.Context, id string) error {
	delete(m.files, id)
	return nil
}
func (m *mockProvider) CreateFolder(_ context.Context, _, name string) (*storage.FileInfo, error) {
	return &storage.FileInfo{RemoteID: name, Name: name, IsDir: true}, nil
}
func (m *mockProvider) Rename(_ context.Context, _, newName string) (*storage.FileInfo, error) {
	return &storage.FileInfo{Name: newName}, nil
}
func (m *mockProvider) Move(_ context.Context, id, parent string) (*storage.FileInfo, error) {
	return &storage.FileInfo{RemoteID: id, ParentID: parent}, nil
}
func (m *mockProvider) Copy(_ context.Context, _, _ string) (*storage.FileInfo, error) {
	return nil, storage.ErrNotSupported
}
func (m *mockProvider) GenerateTempLink(_ context.Context, _ string, _ time.Duration) (string, error) {
	return "", storage.ErrNotSupported
}

func (m *mockProvider) List(_ context.Context, opts storage.ListOptions) (*storage.ListResult, error) {
	var files []storage.FileInfo
	for id, content := range m.files {
		files = append(files, storage.FileInfo{
			RemoteID: id,
			Name:     id,
			IsDir:    false,
			Size:     int64(len(content)),
		})
	}
	return &storage.ListResult{Files: files}, nil
}

func (m *mockProvider) GetFile(_ context.Context, remoteID string) (*storage.FileInfo, error) {
	content, ok := m.files[remoteID]
	if !ok {
		return nil, storage.ErrNotFound
	}
	return &storage.FileInfo{RemoteID: remoteID, Name: remoteID, Size: int64(len(content))}, nil
}

func (m *mockProvider) Upload(_ context.Context, params storage.UploadParams) (*storage.FileInfo, error) {
	data, err := io.ReadAll(params.Body.(io.Reader))
	if err != nil {
		return nil, err
	}
	m.files[params.Name] = data
	return &storage.FileInfo{
		RemoteID: params.Name,
		Name:     params.Name,
		Size:     int64(len(data)),
	}, nil
}

func (m *mockProvider) Download(_ context.Context, remoteID string) (io.ReadCloser, *storage.FileInfo, error) {
	content, ok := m.files[remoteID]
	if !ok {
		return nil, nil, storage.ErrNotFound
	}
	return io.NopCloser(bytes.NewReader(content)), &storage.FileInfo{
		RemoteID: remoteID,
		Name:     remoteID,
		Size:     int64(len(content)),
	}, nil
}

// Verify mockProvider satisfies storage.Provider at compile time.
var _ storage.Provider = (*mockProvider)(nil)

func TestStreamCopy(t *testing.T) {
	src := newMockProvider()
	dst := newMockProvider()
	ctx := context.Background()

	content := []byte("hello transfer")
	src.files["file1"] = content

	fi := storage.FileInfo{RemoteID: "file1", Name: "hello.txt", Size: int64(len(content))}
	destFI, err := streamCopy(ctx, src, dst, fi, "")
	require.NoError(t, err)
	assert.Equal(t, "hello.txt", destFI.Name)
	assert.Equal(t, content, dst.files["hello.txt"])
}

func TestStreamCopy_largeFile(t *testing.T) {
	src := newMockProvider()
	dst := newMockProvider()
	ctx := context.Background()

	// 1 MB file
	content := bytes.Repeat([]byte("x"), 1<<20)
	src.files["big"] = content

	fi := storage.FileInfo{RemoteID: "big", Name: "big.bin", Size: int64(len(content))}
	destFI, err := streamCopy(ctx, src, dst, fi, "")
	require.NoError(t, err)
	assert.Equal(t, int64(1<<20), destFI.Size)
	assert.Equal(t, content, dst.files["big.bin"])
}

func TestListAllFiles_dotMeansRoot(t *testing.T) {
	p := newMockProvider()
	p.files["a.txt"] = []byte("a")
	p.files["b.txt"] = []byte("b")

	files, err := listAllFiles(context.Background(), p, ".")
	require.NoError(t, err)
	assert.Len(t, files, 2)
}

func TestListAllFiles_emptyMeansRoot(t *testing.T) {
	p := newMockProvider()
	p.files["x.txt"] = []byte("x")

	files, err := listAllFiles(context.Background(), p, "")
	require.NoError(t, err)
	assert.Len(t, files, 1)
}

func TestBuildDestIndex(t *testing.T) {
	p := newMockProvider()
	p.files["existing.txt"] = []byte("data")
	p.files["other.txt"] = []byte("other")

	index, err := buildDestIndex(context.Background(), p, "")
	require.NoError(t, err)
	assert.Contains(t, index, "existing.txt")
	assert.Contains(t, index, "other.txt")
	assert.Equal(t, "existing.txt", index["existing.txt"])
}

func TestCountFiles(t *testing.T) {
	files := []storage.FileInfo{
		{Name: "a.txt", IsDir: false},
		{Name: "b.txt", IsDir: false},
		{Name: "folder", IsDir: true},
	}
	assert.Equal(t, 2, countFiles(files))
}
