package s3

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"testing"
	"time"

	awss3 "github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/drivebase/drivebase/internal/storage"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
)

const (
	minioUser     = "minioadmin"
	minioPassword = "minioadmin"
	minioBucket   = "test-bucket"
)

// sharedProvider is initialised once in TestMain and reused by all tests.
var sharedProvider *s3Provider

func TestMain(m *testing.M) {
	ctx := context.Background()

	req := testcontainers.ContainerRequest{
		Image:        "minio/minio:latest",
		ExposedPorts: []string{"9000/tcp"},
		Env: map[string]string{
			"MINIO_ROOT_USER":     minioUser,
			"MINIO_ROOT_PASSWORD": minioPassword,
		},
		Cmd:        []string{"server", "/data"},
		WaitingFor: wait.ForHTTP("/minio/health/live").WithPort("9000").WithStartupTimeout(60 * time.Second),
	}

	container, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: req,
		Started:          true,
	})
	if err != nil {
		fmt.Fprintf(os.Stderr, "start minio container: %v\n", err)
		os.Exit(1)
	}
	defer func() { _ = container.Terminate(ctx) }()

	host, err := container.Host(ctx)
	if err != nil {
		fmt.Fprintf(os.Stderr, "minio host: %v\n", err)
		os.Exit(1)
	}
	port, err := container.MappedPort(ctx, "9000")
	if err != nil {
		fmt.Fprintf(os.Stderr, "minio port: %v\n", err)
		os.Exit(1)
	}

	endpoint := fmt.Sprintf("http://%s:%s", host, port.Port())

	creds, _ := json.Marshal(Credentials{
		Endpoint:     endpoint,
		Region:       "us-east-1",
		Bucket:       minioBucket,
		AccessKey:    minioUser,
		SecretKey:    minioPassword,
		UsePathStyle: true,
	})

	sharedProvider, err = New(creds)
	if err != nil {
		fmt.Fprintf(os.Stderr, "new s3 provider: %v\n", err)
		os.Exit(1)
	}

	// Create the test bucket once
	if _, err := sharedProvider.client.CreateBucket(ctx, &awss3.CreateBucketInput{
		Bucket: &[]string{minioBucket}[0],
	}); err != nil {
		fmt.Fprintf(os.Stderr, "create bucket: %v\n", err)
		os.Exit(1)
	}

	os.Exit(m.Run())
}

// cleanBucket deletes all objects so each test starts with an empty bucket.
func cleanBucket(t *testing.T) {
	t.Helper()
	ctx := context.Background()
	out, err := sharedProvider.client.ListObjectsV2(ctx, &awss3.ListObjectsV2Input{
		Bucket: &[]string{minioBucket}[0],
	})
	require.NoError(t, err)
	for _, obj := range out.Contents {
		_, err := sharedProvider.client.DeleteObject(ctx, &awss3.DeleteObjectInput{
			Bucket: &[]string{minioBucket}[0],
			Key:    obj.Key,
		})
		require.NoError(t, err)
	}
}

func TestS3_Validate(t *testing.T) {
	require.NoError(t, sharedProvider.Validate(context.Background()))
}

func TestS3_UploadAndList(t *testing.T) {
	cleanBucket(t)
	ctx := context.Background()

	content := []byte("hello s3")
	fi, err := sharedProvider.Upload(ctx, storage.UploadParams{
		Name:     "hello.txt",
		MimeType: "text/plain",
		Body:     bytes.NewReader(content),
	})
	require.NoError(t, err)
	assert.Equal(t, "hello.txt", fi.Name)

	result, err := sharedProvider.List(ctx, storage.ListOptions{})
	require.NoError(t, err)
	require.Len(t, result.Files, 1)
	assert.Equal(t, "hello.txt", result.Files[0].Name)
}

func TestS3_Download(t *testing.T) {
	cleanBucket(t)
	ctx := context.Background()

	content := []byte("download test")
	fi, _ := sharedProvider.Upload(ctx, storage.UploadParams{Name: "dl.txt", Body: bytes.NewReader(content)})

	rc, info, err := sharedProvider.Download(ctx, fi.RemoteID)
	require.NoError(t, err)
	defer rc.Close()

	got, err := io.ReadAll(rc)
	require.NoError(t, err)
	assert.Equal(t, content, got)
	assert.Equal(t, "dl.txt", info.Name)
}

func TestS3_CreateFolder(t *testing.T) {
	cleanBucket(t)
	ctx := context.Background()

	fi, err := sharedProvider.CreateFolder(ctx, "", "myfolder")
	require.NoError(t, err)
	assert.True(t, fi.IsDir)
	assert.Equal(t, "myfolder", fi.Name)
}

func TestS3_Delete(t *testing.T) {
	cleanBucket(t)
	ctx := context.Background()

	fi, _ := sharedProvider.Upload(ctx, storage.UploadParams{Name: "del.txt", Body: bytes.NewReader([]byte("x"))})
	require.NoError(t, sharedProvider.Delete(ctx, fi.RemoteID))
}

func TestS3_GenerateTempLink(t *testing.T) {
	cleanBucket(t)
	ctx := context.Background()

	fi, _ := sharedProvider.Upload(ctx, storage.UploadParams{Name: "link.txt", Body: bytes.NewReader([]byte("link"))})
	url, err := sharedProvider.GenerateTempLink(ctx, fi.RemoteID, 60*time.Second)
	require.NoError(t, err)
	assert.NotEmpty(t, url)
}

func TestS3_Rename(t *testing.T) {
	cleanBucket(t)
	ctx := context.Background()

	fi, _ := sharedProvider.Upload(ctx, storage.UploadParams{Name: "old.txt", Body: bytes.NewReader([]byte("data"))})
	renamed, err := sharedProvider.Rename(ctx, fi.RemoteID, "new.txt")
	require.NoError(t, err)
	assert.Equal(t, "new.txt", renamed.Name)
}

func TestS3_Copy(t *testing.T) {
	cleanBucket(t)
	ctx := context.Background()

	sharedProvider.CreateFolder(ctx, "", "dst")
	fi, _ := sharedProvider.Upload(ctx, storage.UploadParams{Name: "orig.txt", Body: bytes.NewReader([]byte("data"))})

	copied, err := sharedProvider.Copy(ctx, fi.RemoteID, "dst")
	require.NoError(t, err)
	assert.Equal(t, "orig.txt", copied.Name)
}
