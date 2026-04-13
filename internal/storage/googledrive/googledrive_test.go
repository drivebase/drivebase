package googledrive

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/drivebase/drivebase/internal/storage"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/oauth2"
	"google.golang.org/api/drive/v3"
	"google.golang.org/api/option"
)

// newFakeProvider creates a Google Drive provider wired to a fake HTTP server.
// The fake server returns canned Drive API responses.
func newFakeProvider(t *testing.T, handler http.Handler) *gdProvider {
	t.Helper()
	srv := httptest.NewServer(handler)
	t.Cleanup(srv.Close)

	// Use a static token — no real OAuth2 needed
	ts := oauth2.StaticTokenSource(&oauth2.Token{
		AccessToken: "fake-token",
		Expiry:      time.Now().Add(time.Hour),
	})
	httpClient := oauth2.NewClient(context.Background(), ts)

	svc, err := drive.NewService(context.Background(),
		option.WithHTTPClient(httpClient),
		option.WithEndpoint(srv.URL),
	)
	require.NoError(t, err)
	return &gdProvider{svc: svc}
}

func TestGDrive_Validate(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/about" {
			json.NewEncoder(w).Encode(map[string]any{
				"user": map[string]string{"displayName": "Test User"},
			})
			return
		}
		http.NotFound(w, r)
	})

	p := newFakeProvider(t, handler)
	require.NoError(t, p.Validate(context.Background()))
}

func TestGDrive_List(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/files" {
			json.NewEncoder(w).Encode(map[string]any{
				"files": []map[string]any{
					{
						"id":           "file1",
						"name":         "document.txt",
						"mimeType":     "text/plain",
						"size":         "1024",
						"modifiedTime": time.Now().Format(time.RFC3339),
						"parents":      []string{"root"},
					},
					{
						"id":       "folder1",
						"name":     "My Folder",
						"mimeType": "application/vnd.google-apps.folder",
						"parents":  []string{"root"},
					},
				},
				"nextPageToken": "",
			})
			return
		}
		http.NotFound(w, r)
	})

	p := newFakeProvider(t, handler)
	result, err := p.List(context.Background(), storage.ListOptions{})
	require.NoError(t, err)
	require.Len(t, result.Files, 2)
	assert.Equal(t, "document.txt", result.Files[0].Name)
	assert.False(t, result.Files[0].IsDir)
	assert.Equal(t, "My Folder", result.Files[1].Name)
	assert.True(t, result.Files[1].IsDir)
}

func TestGDrive_GetFile(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]any{
			"id":           "abc123",
			"name":         "report.pdf",
			"mimeType":     "application/pdf",
			"size":         "5000",
			"md5Checksum":  "abc",
			"modifiedTime": time.Now().Format(time.RFC3339),
			"parents":      []string{"root"},
		})
	})

	p := newFakeProvider(t, handler)
	fi, err := p.GetFile(context.Background(), "abc123")
	require.NoError(t, err)
	assert.Equal(t, "report.pdf", fi.Name)
	assert.Equal(t, int64(5000), fi.Size)
}

func TestGDrive_GetFile_notFound(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]any{
			"error": map[string]any{
				"code":    404,
				"message": "File not found",
			},
		})
	})

	p := newFakeProvider(t, handler)
	_, err := p.GetFile(context.Background(), "nonexistent")
	assert.ErrorIs(t, err, storage.ErrNotFound)
}

func TestGDrive_CreateFolder(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]any{
			"id":           "newFolder1",
			"name":         "New Folder",
			"mimeType":     "application/vnd.google-apps.folder",
			"modifiedTime": time.Now().Format(time.RFC3339),
			"parents":      []string{"root"},
		})
	})

	p := newFakeProvider(t, handler)
	fi, err := p.CreateFolder(context.Background(), "", "New Folder")
	require.NoError(t, err)
	assert.Equal(t, "New Folder", fi.Name)
	assert.True(t, fi.IsDir)
}

func TestGDrive_Copy_notSupported(t *testing.T) {
	p := &gdProvider{}
	_, err := p.Copy(context.Background(), "any", "any")
	assert.ErrorIs(t, err, storage.ErrNotSupported)
}

func TestGDrive_GenerateTempLink_notSupported(t *testing.T) {
	p := &gdProvider{}
	_, err := p.GenerateTempLink(context.Background(), "any", time.Hour)
	assert.ErrorIs(t, err, storage.ErrNotSupported)
}

func TestGDrive_Type(t *testing.T) {
	p := &gdProvider{}
	assert.Equal(t, storage.ProviderTypeGoogleDrive, p.Type())
}

func TestGDrive_GetQuota(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/about" {
			json.NewEncoder(w).Encode(map[string]any{
				"storageQuota": map[string]any{
					"limit":              "107374182400", // 100 GB
					"usage":              "10737418240",  // 10 GB used
					"usageInDrive":       "9663676416",   // 9 GB in Drive
					"usageInDriveTrash": "1073741824",   // 1 GB in trash
				},
				"user": map[string]string{
					"displayName":  "Test User",
					"emailAddress": "test@example.com",
				},
			})
			return
		}
		http.NotFound(w, r)
	})

	p := newFakeProvider(t, handler)
	qp, ok := storage.Provider(p).(storage.QuotaProvider)
	require.True(t, ok, "gdProvider should implement QuotaProvider")

	info, err := qp.GetQuota(context.Background())
	require.NoError(t, err)
	assert.Equal(t, int64(107374182400), info.TotalBytes)
	assert.Equal(t, int64(10737418240), info.UsedBytes)
	assert.Equal(t, int64(96636764160), info.FreeBytes)
	assert.Equal(t, int64(1073741824), info.TrashBytes)
	assert.Equal(t, "Google One 100 GB", info.PlanName)
	assert.Equal(t, "Test User", info.Extra["display_name"])
}
