package googledrive

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/drive/v3"
	"google.golang.org/api/googleapi"
	"google.golang.org/api/option"

	"github.com/drivebase/drivebase/internal/storage"
)

func init() {
	storage.Register(storage.ProviderTypeGoogleDrive, func(creds storage.Credentials) (storage.Provider, error) {
		return New(creds)
	})
}

// Credentials holds OAuth2 details for a Google Drive account.
type Credentials struct {
	ClientID     string    `json:"client_id"`
	ClientSecret string    `json:"client_secret"`
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	Expiry       time.Time `json:"expiry"`
}

// OnTokenRefresh is called when the access token is refreshed.
// The caller (resolver) should re-encrypt and persist the new credentials.
type OnTokenRefresh func(updated Credentials)

type gdProvider struct {
	svc            *drive.Service
	onTokenRefresh OnTokenRefresh
}

// New creates a Google Drive provider. onRefresh may be nil.
func New(creds storage.Credentials, opts ...Option) (*gdProvider, error) {
	var c Credentials
	if err := json.Unmarshal(creds, &c); err != nil {
		return nil, fmt.Errorf("googledrive: invalid credentials: %w", err)
	}

	cfg := &oauth2.Config{
		ClientID:     c.ClientID,
		ClientSecret: c.ClientSecret,
		Endpoint:     google.Endpoint,
		Scopes:       []string{drive.DriveScope},
	}

	token := &oauth2.Token{
		AccessToken:  c.AccessToken,
		RefreshToken: c.RefreshToken,
		Expiry:       c.Expiry,
		TokenType:    "Bearer",
	}

	p := &gdProvider{}
	for _, o := range opts {
		o(p)
	}

	// Wrap token source so we can intercept refreshes
	ts := cfg.TokenSource(context.Background(), token)
	if p.onTokenRefresh != nil {
		ts = &refreshNotifyTokenSource{
			base:     ts,
			current:  token,
			cfg:      cfg,
			creds:    c,
			onUpdate: p.onTokenRefresh,
		}
	}

	httpClient := oauth2.NewClient(context.Background(), ts)
	svc, err := drive.NewService(context.Background(), option.WithHTTPClient(httpClient))
	if err != nil {
		return nil, fmt.Errorf("googledrive: create service: %w", err)
	}

	p.svc = svc
	return p, nil
}

// Option is a functional option for configuring the Google Drive provider.
type Option func(*gdProvider)

// WithTokenRefreshCallback sets a callback that is called whenever the OAuth2
// access token is refreshed, so the caller can persist the new credentials.
func WithTokenRefreshCallback(fn OnTokenRefresh) Option {
	return func(p *gdProvider) { p.onTokenRefresh = fn }
}

func (p *gdProvider) Type() storage.ProviderType { return storage.ProviderTypeGoogleDrive }

func (p *gdProvider) Validate(ctx context.Context) error {
	_, err := p.svc.About.Get().Fields("user").Context(ctx).Do()
	if err != nil {
		return fmt.Errorf("googledrive: validate: %w", err)
	}
	return nil
}

func (p *gdProvider) List(ctx context.Context, opts storage.ListOptions) (*storage.ListResult, error) {
	parentID := opts.ParentID
	if parentID == "" {
		parentID = "root"
	}

	q := fmt.Sprintf("'%s' in parents and trashed = false", parentID)
	pageSize := int64(100)
	if opts.PageSize > 0 {
		pageSize = int64(opts.PageSize)
	}

	call := p.svc.Files.List().
		Q(q).
		Fields("nextPageToken, files(id,name,mimeType,size,md5Checksum,modifiedTime,parents)").
		PageSize(pageSize).
		Context(ctx)

	if opts.PageToken != "" {
		call = call.PageToken(opts.PageToken)
	}

	out, err := call.Do()
	if err != nil {
		return nil, fmt.Errorf("googledrive: list: %w", err)
	}

	files := make([]storage.FileInfo, 0, len(out.Files))
	for _, f := range out.Files {
		files = append(files, driveFileToInfo(f, opts.ParentID))
	}

	return &storage.ListResult{
		Files:         files,
		NextPageToken: out.NextPageToken,
	}, nil
}

func (p *gdProvider) GetFile(ctx context.Context, remoteID string) (*storage.FileInfo, error) {
	f, err := p.svc.Files.Get(remoteID).
		Fields("id,name,mimeType,size,md5Checksum,modifiedTime,parents").
		Context(ctx).Do()
	if err != nil {
		if isGDriveNotFound(err) {
			return nil, storage.ErrNotFound
		}
		return nil, fmt.Errorf("googledrive: get file: %w", err)
	}
	parentID := ""
	if len(f.Parents) > 0 {
		parentID = f.Parents[0]
	}
	fi := driveFileToInfo(f, parentID)
	return &fi, nil
}

func (p *gdProvider) Upload(ctx context.Context, params storage.UploadParams) (*storage.FileInfo, error) {
	parentID := params.ParentID
	if parentID == "" {
		parentID = "root"
	}

	meta := &drive.File{
		Name:    params.Name,
		Parents: []string{parentID},
	}
	if params.MimeType != "" {
		meta.MimeType = params.MimeType
	}

	f, err := p.svc.Files.Create(meta).
		Media(params.Body.(io.Reader)).
		Fields("id,name,mimeType,size,md5Checksum,modifiedTime,parents").
		Context(ctx).Do()
	if err != nil {
		return nil, fmt.Errorf("googledrive: upload: %w", err)
	}

	fi := driveFileToInfo(f, params.ParentID)
	return &fi, nil
}

func (p *gdProvider) Download(ctx context.Context, remoteID string) (io.ReadCloser, *storage.FileInfo, error) {
	fi, err := p.GetFile(ctx, remoteID)
	if err != nil {
		return nil, nil, err
	}

	resp, err := p.svc.Files.Get(remoteID).Context(ctx).Download()
	if err != nil {
		return nil, nil, fmt.Errorf("googledrive: download: %w", err)
	}
	return resp.Body, fi, nil
}

func (p *gdProvider) Delete(ctx context.Context, remoteID string) error {
	if err := p.svc.Files.Delete(remoteID).Context(ctx).Do(); err != nil {
		if isGDriveNotFound(err) {
			return storage.ErrNotFound
		}
		return fmt.Errorf("googledrive: delete: %w", err)
	}
	return nil
}

func (p *gdProvider) CreateFolder(ctx context.Context, parentID, name string) (*storage.FileInfo, error) {
	if parentID == "" {
		parentID = "root"
	}
	f, err := p.svc.Files.Create(&drive.File{
		Name:     name,
		MimeType: "application/vnd.google-apps.folder",
		Parents:  []string{parentID},
	}).Fields("id,name,mimeType,modifiedTime,parents").Context(ctx).Do()
	if err != nil {
		return nil, fmt.Errorf("googledrive: create folder: %w", err)
	}
	fi := driveFileToInfo(f, parentID)
	return &fi, nil
}

func (p *gdProvider) Rename(ctx context.Context, remoteID, newName string) (*storage.FileInfo, error) {
	f, err := p.svc.Files.Update(remoteID, &drive.File{Name: newName}).
		Fields("id,name,mimeType,size,md5Checksum,modifiedTime,parents").
		Context(ctx).Do()
	if err != nil {
		if isGDriveNotFound(err) {
			return nil, storage.ErrNotFound
		}
		return nil, fmt.Errorf("googledrive: rename: %w", err)
	}
	parentID := ""
	if len(f.Parents) > 0 {
		parentID = f.Parents[0]
	}
	fi := driveFileToInfo(f, parentID)
	return &fi, nil
}

func (p *gdProvider) Move(ctx context.Context, remoteID, newParentID string) (*storage.FileInfo, error) {
	// Get current parents first
	existing, err := p.svc.Files.Get(remoteID).Fields("parents").Context(ctx).Do()
	if err != nil {
		if isGDriveNotFound(err) {
			return nil, storage.ErrNotFound
		}
		return nil, fmt.Errorf("googledrive: get parents for move: %w", err)
	}

	oldParents := ""
	if len(existing.Parents) > 0 {
		oldParents = existing.Parents[0]
	}

	f, err := p.svc.Files.Update(remoteID, &drive.File{}).
		AddParents(newParentID).
		RemoveParents(oldParents).
		Fields("id,name,mimeType,size,md5Checksum,modifiedTime,parents").
		Context(ctx).Do()
	if err != nil {
		return nil, fmt.Errorf("googledrive: move: %w", err)
	}
	fi := driveFileToInfo(f, newParentID)
	return &fi, nil
}

// Copy is not natively supported by Drive API for arbitrary files.
func (p *gdProvider) Copy(_ context.Context, _ string, _ string) (*storage.FileInfo, error) {
	return nil, storage.ErrNotSupported
}

// GenerateTempLink is not supported by Google Drive (OAuth-only access).
func (p *gdProvider) GenerateTempLink(_ context.Context, _ string, _ time.Duration) (string, error) {
	return "", storage.ErrNotSupported
}

// --- helpers ---

func driveFileToInfo(f *drive.File, parentID string) storage.FileInfo {
	isDir := f.MimeType == "application/vnd.google-apps.folder"
	var modTime time.Time
	if f.ModifiedTime != "" {
		modTime, _ = time.Parse(time.RFC3339, f.ModifiedTime)
	}
	return storage.FileInfo{
		RemoteID:   f.Id,
		Name:       f.Name,
		IsDir:      isDir,
		Size:       f.Size,
		MimeType:   f.MimeType,
		Checksum:   f.Md5Checksum,
		ModifiedAt: modTime,
		ParentID:   parentID,
	}
}

func isGDriveNotFound(err error) bool {
	if apiErr, ok := err.(*googleapi.Error); ok {
		return apiErr.Code == http.StatusNotFound
	}
	return false
}

// refreshNotifyTokenSource wraps an oauth2.TokenSource and calls a callback
// when the access token is refreshed, so callers can persist updated credentials.
type refreshNotifyTokenSource struct {
	base     oauth2.TokenSource
	current  *oauth2.Token
	cfg      *oauth2.Config
	creds    Credentials
	onUpdate OnTokenRefresh
}

func (ts *refreshNotifyTokenSource) Token() (*oauth2.Token, error) {
	t, err := ts.base.Token()
	if err != nil {
		return nil, err
	}
	// If the token changed (refresh happened), notify caller
	if t.AccessToken != ts.current.AccessToken {
		ts.current = t
		updated := ts.creds
		updated.AccessToken = t.AccessToken
		updated.Expiry = t.Expiry
		ts.onUpdate(updated)
	}
	return t, nil
}
