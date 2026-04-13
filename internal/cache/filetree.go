package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

// FileTreeCache caches directory listings keyed by provider + parent.
type FileTreeCache struct {
	rdb *redis.Client
	ttl time.Duration
}

// CachedListing is what we store in Redis for a directory listing.
type CachedListing struct {
	Files         []CachedFile `json:"files"`
	NextPageToken string       `json:"next_page_token,omitempty"`
	CachedAt      time.Time    `json:"cached_at"`
}

// CachedFile is a lightweight representation of a file node in cache.
type CachedFile struct {
	RemoteID   string    `json:"remote_id"`
	Name       string    `json:"name"`
	IsDir      bool      `json:"is_dir"`
	Size       int64     `json:"size"`
	MimeType   string    `json:"mime_type,omitempty"`
	Checksum   string    `json:"checksum,omitempty"`
	ModifiedAt time.Time `json:"modified_at,omitempty"`
	ParentID   string    `json:"parent_id,omitempty"`
}

// NewFileTreeCache creates a file tree cache backed by Redis.
func NewFileTreeCache(rdb *redis.Client, ttl time.Duration) *FileTreeCache {
	return &FileTreeCache{rdb: rdb, ttl: ttl}
}

func listingKey(providerID uuid.UUID, parentRemoteID string) string {
	return fmt.Sprintf("filetree:%s:%s", providerID, parentRemoteID)
}

// Get returns a cached listing, or (nil, nil) on cache miss.
func (c *FileTreeCache) Get(ctx context.Context, providerID uuid.UUID, parentRemoteID string) (*CachedListing, error) {
	key := listingKey(providerID, parentRemoteID)
	data, err := c.rdb.Get(ctx, key).Bytes()
	if err == redis.Nil {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("cache: get listing: %w", err)
	}
	var listing CachedListing
	if err := json.Unmarshal(data, &listing); err != nil {
		return nil, fmt.Errorf("cache: unmarshal listing: %w", err)
	}
	return &listing, nil
}

// Set stores a listing in the cache with the configured TTL.
func (c *FileTreeCache) Set(ctx context.Context, providerID uuid.UUID, parentRemoteID string, listing *CachedListing) error {
	listing.CachedAt = time.Now()
	data, err := json.Marshal(listing)
	if err != nil {
		return fmt.Errorf("cache: marshal listing: %w", err)
	}
	key := listingKey(providerID, parentRemoteID)
	return c.rdb.Set(ctx, key, data, c.ttl).Err()
}

// Invalidate removes the cached listing for a directory.
func (c *FileTreeCache) Invalidate(ctx context.Context, providerID uuid.UUID, parentRemoteID string) error {
	return c.rdb.Del(ctx, listingKey(providerID, parentRemoteID)).Err()
}

// InvalidateProvider removes all cached listings for a provider.
func (c *FileTreeCache) InvalidateProvider(ctx context.Context, providerID uuid.UUID) error {
	pattern := fmt.Sprintf("filetree:%s:*", providerID)
	iter := c.rdb.Scan(ctx, 0, pattern, 0).Iterator()
	var keys []string
	for iter.Next(ctx) {
		keys = append(keys, iter.Val())
	}
	if err := iter.Err(); err != nil {
		return fmt.Errorf("cache: scan provider keys: %w", err)
	}
	if len(keys) == 0 {
		return nil
	}
	return c.rdb.Del(ctx, keys...).Err()
}
