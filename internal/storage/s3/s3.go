package s3

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/drivebase/drivebase/internal/storage"
)

func init() {
	storage.Register(storage.ProviderTypeS3, func(creds storage.Credentials) (storage.Provider, error) {
		return New(creds)
	})
}

// Credentials holds S3/MinIO connection details.
type Credentials struct {
	Endpoint     string `json:"endpoint"`      // e.g. "http://localhost:9000" for MinIO
	Region       string `json:"region"`        // e.g. "us-east-1"
	Bucket       string `json:"bucket"`
	AccessKey    string `json:"access_key"`
	SecretKey    string `json:"secret_key"`
	UsePathStyle bool   `json:"use_path_style"` // true for MinIO
}

type s3Provider struct {
	client *s3.Client
	bucket string
	creds  Credentials
}

// New creates an S3/MinIO provider from credentials.
func New(creds storage.Credentials) (*s3Provider, error) {
	var c Credentials
	if err := json.Unmarshal(creds, &c); err != nil {
		return nil, fmt.Errorf("s3: invalid credentials: %w", err)
	}
	if c.Bucket == "" {
		return nil, fmt.Errorf("s3: bucket is required")
	}

	opts := []func(*awsconfig.LoadOptions) error{
		awsconfig.WithRegion(c.Region),
		awsconfig.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(c.AccessKey, c.SecretKey, ""),
		),
	}

	cfg, err := awsconfig.LoadDefaultConfig(context.Background(), opts...)
	if err != nil {
		return nil, fmt.Errorf("s3: load config: %w", err)
	}

	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		if c.Endpoint != "" {
			o.BaseEndpoint = aws.String(c.Endpoint)
		}
		o.UsePathStyle = c.UsePathStyle
	})

	return &s3Provider{client: client, bucket: c.Bucket, creds: c}, nil
}

func (p *s3Provider) Type() storage.ProviderType { return storage.ProviderTypeS3 }

func (p *s3Provider) Validate(ctx context.Context) error {
	_, err := p.client.HeadBucket(ctx, &s3.HeadBucketInput{
		Bucket: aws.String(p.bucket),
	})
	if err != nil {
		return fmt.Errorf("s3: validate: %w", err)
	}
	return nil
}

func (p *s3Provider) List(ctx context.Context, opts storage.ListOptions) (*storage.ListResult, error) {
	prefix := toPrefix(opts.ParentID)

	input := &s3.ListObjectsV2Input{
		Bucket:    aws.String(p.bucket),
		Prefix:    aws.String(prefix),
		Delimiter: aws.String("/"),
	}
	if opts.PageToken != "" {
		input.ContinuationToken = aws.String(opts.PageToken)
	}
	if opts.PageSize > 0 {
		input.MaxKeys = aws.Int32(int32(opts.PageSize))
	}

	out, err := p.client.ListObjectsV2(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("s3: list: %w", err)
	}

	var files []storage.FileInfo

	// Common prefixes = "folders"
	for _, cp := range out.CommonPrefixes {
		key := aws.ToString(cp.Prefix)
		name := strings.TrimSuffix(strings.TrimPrefix(key, prefix), "/")
		files = append(files, storage.FileInfo{
			RemoteID: key,
			Name:     name,
			IsDir:    true,
			ParentID: opts.ParentID,
		})
	}

	// Objects = files
	for _, obj := range out.Contents {
		key := aws.ToString(obj.Key)
		// Skip the directory marker itself
		if key == prefix {
			continue
		}
		name := strings.TrimPrefix(key, prefix)
		files = append(files, storage.FileInfo{
			RemoteID:   key,
			Name:       name,
			IsDir:      false,
			Size:       aws.ToInt64(obj.Size),
			Checksum:   strings.Trim(aws.ToString(obj.ETag), `"`),
			ModifiedAt: aws.ToTime(obj.LastModified),
			ParentID:   opts.ParentID,
		})
	}

	result := &storage.ListResult{Files: files}
	if out.NextContinuationToken != nil {
		result.NextPageToken = *out.NextContinuationToken
	}
	return result, nil
}

func (p *s3Provider) GetFile(ctx context.Context, remoteID string) (*storage.FileInfo, error) {
	out, err := p.client.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(p.bucket),
		Key:    aws.String(remoteID),
	})
	if err != nil {
		if isNotFound(err) {
			return nil, storage.ErrNotFound
		}
		return nil, fmt.Errorf("s3: head object: %w", err)
	}

	parentID := parentKey(remoteID)
	fi := &storage.FileInfo{
		RemoteID:   remoteID,
		Name:       keyName(remoteID),
		IsDir:      strings.HasSuffix(remoteID, "/"),
		Size:       aws.ToInt64(out.ContentLength),
		MimeType:   aws.ToString(out.ContentType),
		Checksum:   strings.Trim(aws.ToString(out.ETag), `"`),
		ModifiedAt: aws.ToTime(out.LastModified),
		ParentID:   parentID,
	}
	return fi, nil
}

func (p *s3Provider) Upload(ctx context.Context, params storage.UploadParams) (*storage.FileInfo, error) {
	key := toKey(params.ParentID, params.Name)

	_, err := p.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(p.bucket),
		Key:         aws.String(key),
		Body:        params.Body.(io.Reader),
		ContentType: aws.String(params.MimeType),
	})
	if err != nil {
		return nil, fmt.Errorf("s3: upload: %w", err)
	}

	return p.GetFile(ctx, key)
}

func (p *s3Provider) Download(ctx context.Context, remoteID string) (io.ReadCloser, *storage.FileInfo, error) {
	out, err := p.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(p.bucket),
		Key:    aws.String(remoteID),
	})
	if err != nil {
		if isNotFound(err) {
			return nil, nil, storage.ErrNotFound
		}
		return nil, nil, fmt.Errorf("s3: download: %w", err)
	}

	fi := &storage.FileInfo{
		RemoteID:   remoteID,
		Name:       keyName(remoteID),
		Size:       aws.ToInt64(out.ContentLength),
		MimeType:   aws.ToString(out.ContentType),
		Checksum:   strings.Trim(aws.ToString(out.ETag), `"`),
		ModifiedAt: aws.ToTime(out.LastModified),
		ParentID:   parentKey(remoteID),
	}
	return out.Body, fi, nil
}

func (p *s3Provider) Delete(ctx context.Context, remoteID string) error {
	_, err := p.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(p.bucket),
		Key:    aws.String(remoteID),
	})
	if err != nil {
		return fmt.Errorf("s3: delete: %w", err)
	}
	return nil
}

func (p *s3Provider) CreateFolder(ctx context.Context, parentID, name string) (*storage.FileInfo, error) {
	// S3 folders are simulated by a key ending in "/"
	key := toKey(parentID, name) + "/"
	_, err := p.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket: aws.String(p.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return nil, fmt.Errorf("s3: create folder: %w", err)
	}
	return &storage.FileInfo{
		RemoteID: key,
		Name:     name,
		IsDir:    true,
		ParentID: parentID,
	}, nil
}

func (p *s3Provider) Rename(ctx context.Context, remoteID, newName string) (*storage.FileInfo, error) {
	parentID := parentKey(remoteID)
	newKey := toKey(parentID, newName)
	if err := p.copyObject(ctx, remoteID, newKey); err != nil {
		return nil, err
	}
	if err := p.Delete(ctx, remoteID); err != nil {
		return nil, err
	}
	return p.GetFile(ctx, newKey)
}

func (p *s3Provider) Move(ctx context.Context, remoteID, newParentID string) (*storage.FileInfo, error) {
	name := keyName(remoteID)
	newKey := toKey(newParentID, name)
	if err := p.copyObject(ctx, remoteID, newKey); err != nil {
		return nil, err
	}
	if err := p.Delete(ctx, remoteID); err != nil {
		return nil, err
	}
	return p.GetFile(ctx, newKey)
}

func (p *s3Provider) Copy(ctx context.Context, remoteID, newParentID string) (*storage.FileInfo, error) {
	name := keyName(remoteID)
	newKey := toKey(newParentID, name)
	if err := p.copyObject(ctx, remoteID, newKey); err != nil {
		return nil, err
	}
	return p.GetFile(ctx, newKey)
}

func (p *s3Provider) GenerateTempLink(ctx context.Context, remoteID string, ttl time.Duration) (string, error) {
	presigner := s3.NewPresignClient(p.client)
	req, err := presigner.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(p.bucket),
		Key:    aws.String(remoteID),
	}, s3.WithPresignExpires(ttl))
	if err != nil {
		return "", fmt.Errorf("s3: presign: %w", err)
	}
	return req.URL, nil
}

// copyObject copies a single S3 object to a new key within the same bucket.
func (p *s3Provider) copyObject(ctx context.Context, srcKey, dstKey string) error {
	_, err := p.client.CopyObject(ctx, &s3.CopyObjectInput{
		Bucket:     aws.String(p.bucket),
		CopySource: aws.String(p.bucket + "/" + srcKey),
		Key:        aws.String(dstKey),
	})
	if err != nil {
		return fmt.Errorf("s3: copy object: %w", err)
	}
	return nil
}

// --- Key helpers ---

// toPrefix converts a folder remoteID to an S3 prefix (ensures trailing slash).
func toPrefix(folderID string) string {
	if folderID == "" {
		return ""
	}
	if !strings.HasSuffix(folderID, "/") {
		return folderID + "/"
	}
	return folderID
}

// toKey builds a full S3 key from a parent folder ID and a file name.
func toKey(parentID, name string) string {
	if parentID == "" {
		return name
	}
	prefix := toPrefix(parentID)
	return prefix + name
}

// keyName returns the final component of an S3 key (the "filename").
func keyName(key string) string {
	key = strings.TrimSuffix(key, "/")
	idx := strings.LastIndex(key, "/")
	if idx < 0 {
		return key
	}
	return key[idx+1:]
}

// parentKey returns the parent prefix of an S3 key.
func parentKey(key string) string {
	key = strings.TrimSuffix(key, "/")
	idx := strings.LastIndex(key, "/")
	if idx < 0 {
		return ""
	}
	return key[:idx+1]
}

func isNotFound(err error) bool {
	var notFound *types.NoSuchKey
	var notFoundBucket *types.NoSuchBucket
	return errors.As(err, &notFound) || errors.As(err, &notFoundBucket)
}
