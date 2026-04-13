package storage

import (
	"context"
	"io"
	"time"
)

// Provider is the interface every storage backend must implement.
// All methods must be safe for concurrent use.
type Provider interface {
	// Type returns the provider type identifier.
	Type() ProviderType

	// Validate checks that the credentials are valid and the backend is reachable.
	// Called once when a provider is first connected, and periodically to detect issues.
	Validate(ctx context.Context) error

	// List returns the contents of a folder (non-recursive).
	List(ctx context.Context, opts ListOptions) (*ListResult, error)

	// GetFile returns metadata for a single file or folder by its remote ID.
	GetFile(ctx context.Context, remoteID string) (*FileInfo, error)

	// Upload streams a file to the provider and returns the created FileInfo.
	Upload(ctx context.Context, params UploadParams) (*FileInfo, error)

	// Download opens a read stream for a file. The caller must close the returned reader.
	// Also returns the file metadata.
	Download(ctx context.Context, remoteID string) (io.ReadCloser, *FileInfo, error)

	// Delete removes a file or folder (and its contents if a folder).
	Delete(ctx context.Context, remoteID string) error

	// CreateFolder creates a new folder and returns its FileInfo.
	CreateFolder(ctx context.Context, parentID, name string) (*FileInfo, error)

	// Rename renames a file or folder in place.
	Rename(ctx context.Context, remoteID, newName string) (*FileInfo, error)

	// Move moves a file or folder to a different parent folder.
	Move(ctx context.Context, remoteID, newParentID string) (*FileInfo, error)

	// Copy duplicates a file into a target folder.
	// Returns ErrNotSupported if the provider cannot copy server-side.
	Copy(ctx context.Context, remoteID, newParentID string) (*FileInfo, error)

	// GenerateTempLink creates a time-limited direct download URL.
	// Returns ErrNotSupported if the provider does not support signed URLs.
	GenerateTempLink(ctx context.Context, remoteID string, ttl time.Duration) (string, error)
}
