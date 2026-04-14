package storage

import "time"

// ProviderType identifies which storage backend to use.
type ProviderType string

const (
	ProviderTypeGoogleDrive ProviderType = "GOOGLE_DRIVE"
	ProviderTypeS3          ProviderType = "S3"
	ProviderTypeLocal       ProviderType = "LOCAL"
)

// FileInfo is a provider-agnostic representation of a file or folder.
type FileInfo struct {
	RemoteID   string
	Name       string
	IsDir      bool
	Size       int64
	MimeType   string
	Checksum   string    // MD5 or similar — may be empty if provider doesn't supply it
	ModifiedAt time.Time
	// ParentID is the provider-specific ID of the parent folder.
	// Empty string means root.
	ParentID string
}

// ListOptions controls how List() paginates results.
type ListOptions struct {
	// ParentID is the provider-specific folder ID to list.
	// Empty string means root.
	ParentID  string
	PageToken string
	PageSize  int // 0 = provider default
}

// ListResult holds a page of files and a token for the next page.
type ListResult struct {
	Files         []FileInfo
	NextPageToken string // empty string means no more pages
}

// UploadParams describes a file to be uploaded.
type UploadParams struct {
	ParentID string
	Name     string
	Size     int64  // -1 if unknown
	MimeType string
	Body     interface{ Read([]byte) (int, error) } // io.Reader
}

// QuotaInfo holds storage quota and plan details for a provider.
// Fields are zero-valued when not reported by the provider.
type QuotaInfo struct {
	// TotalBytes is the total storage capacity. 0 = unlimited or unknown.
	TotalBytes int64
	// UsedBytes is the amount of storage currently consumed.
	UsedBytes int64
	// FreeBytes is the remaining available space. 0 = unlimited or unknown.
	FreeBytes int64
	// TrashBytes is space used by trashed/deleted files (provider-specific).
	TrashBytes int64
	// PlanName is a human-readable name for the current subscription tier.
	// Empty if the provider does not expose this.
	PlanName string
	// Extra holds any provider-specific fields (e.g. breakdown by service).
	Extra map[string]any
}

// Credentials is an opaque JSON blob specific to each provider type.
// Google Drive: {"client_id","client_secret","access_token","refresh_token","expiry"}
// S3:           {"endpoint","region","bucket","access_key","secret_key","use_path_style"}
// Local:        {"base_path"}
type Credentials []byte
