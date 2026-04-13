package s3

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"testing"
	"time"

	awss3 "github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/drivebase/drivebase/internal/storage"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
)

// startMinio spins up a MinIO container and returns a configured provider + cleanup func.
func startMinio(t *testing.T) (*s3Provider, func()) {
	t.Helper()
	ctx := context.Background()

	const (
		user     = "minioadmin"
		password = "minioadmin"
		bucket   = "test-bucket"
	)

	req := testcontainers.ContainerRequest{
		Image:        "minio/minio:latest",
		ExposedPorts: []string{"9000/tcp"},
		Env: map[string]string{
			"MINIO_ROOT_USER":     user,
			"MINIO_ROOT_PASSWORD": password,
		},
		Cmd:        []string{"server", "/data"},
		WaitingFor: wait.ForHTTP("/minio/health/live").WithPort("9000").WithStartupTimeout(60 * time.Second),
	}

	container, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: req,
		Started:          true,
	})
	require.NoError(t, err)

	host, err := container.Host(ctx)
	require.NoError(t, err)
	port, err := container.MappedPort(ctx, "9000")
	require.NoError(t, err)

	endpoint := fmt.Sprintf("http://%s:%s", host, port.Port())

	creds, _ := json.Marshal(Credentials{
		Endpoint:     endpoint,
		Region:       "us-east-1",
		Bucket:       bucket,
		AccessKey:    user,
		SecretKey:    password,
		UsePathStyle: true,
	})

	p, err := New(creds)
	require.NoError(t, err)

	// Create the test bucket
	_, err = p.client.CreateBucket(ctx, &awss3.CreateBucketInput{
		Bucket: &[]string{bucket}[0],
	})
	require.NoError(t, err)

	return p, func() { _ = container.Terminate(ctx) }
}

func TestS3_Validate(t *testing.T) {
	p, cleanup := startMinio(t)
	defer cleanup()
	require.NoError(t, p.Validate(context.Background()))
}

func TestS3_UploadAndList(t *testing.T) {
	p, cleanup := startMinio(t)
	defer cleanup()
	ctx := context.Background()

	content := []byte("hello s3")
	fi, err := p.Upload(ctx, storage.UploadParams{
		Name:     "hello.txt",
		MimeType: "text/plain",
		Body:     bytes.NewReader(content),
	})
	require.NoError(t, err)
	assert.Equal(t, "hello.txt", fi.Name)

	result, err := p.List(ctx, storage.ListOptions{})
	require.NoError(t, err)
	require.Len(t, result.Files, 1)
	assert.Equal(t, "hello.txt", result.Files[0].Name)
}

func TestS3_Download(t *testing.T) {
	p, cleanup := startMinio(t)
	defer cleanup()
	ctx := context.Background()

	content := []byte("download test")
	fi, _ := p.Upload(ctx, storage.UploadParams{Name: "dl.txt", Body: bytes.NewReader(content)})

	rc, info, err := p.Download(ctx, fi.RemoteID)
	require.NoError(t, err)
	defer rc.Close()

	got, err := io.ReadAll(rc)
	require.NoError(t, err)
	assert.Equal(t, content, got)
	assert.Equal(t, "dl.txt", info.Name)
}

func TestS3_CreateFolder(t *testing.T) {
	p, cleanup := startMinio(t)
	defer cleanup()
	ctx := context.Background()

	fi, err := p.CreateFolder(ctx, "", "myfolder")
	require.NoError(t, err)
	assert.True(t, fi.IsDir)
	assert.Equal(t, "myfolder", fi.Name)
}

func TestS3_Delete(t *testing.T) {
	p, cleanup := startMinio(t)
	defer cleanup()
	ctx := context.Background()

	fi, _ := p.Upload(ctx, storage.UploadParams{Name: "del.txt", Body: bytes.NewReader([]byte("x"))})
	require.NoError(t, p.Delete(ctx, fi.RemoteID))
}

func TestS3_GenerateTempLink(t *testing.T) {
	p, cleanup := startMinio(t)
	defer cleanup()
	ctx := context.Background()

	fi, _ := p.Upload(ctx, storage.UploadParams{Name: "link.txt", Body: bytes.NewReader([]byte("link"))})
	url, err := p.GenerateTempLink(ctx, fi.RemoteID, 60*time.Second)
	require.NoError(t, err)
	assert.NotEmpty(t, url)
}

func TestS3_Rename(t *testing.T) {
	p, cleanup := startMinio(t)
	defer cleanup()
	ctx := context.Background()

	fi, _ := p.Upload(ctx, storage.UploadParams{Name: "old.txt", Body: bytes.NewReader([]byte("data"))})
	renamed, err := p.Rename(ctx, fi.RemoteID, "new.txt")
	require.NoError(t, err)
	assert.Equal(t, "new.txt", renamed.Name)
}

func TestS3_Copy(t *testing.T) {
	p, cleanup := startMinio(t)
	defer cleanup()
	ctx := context.Background()

	p.CreateFolder(ctx, "", "dst")
	fi, _ := p.Upload(ctx, storage.UploadParams{Name: "orig.txt", Body: bytes.NewReader([]byte("data"))})

	copied, err := p.Copy(ctx, fi.RemoteID, "dst")
	require.NoError(t, err)
	assert.Equal(t, "orig.txt", copied.Name)
}
