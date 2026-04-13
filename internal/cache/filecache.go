package cache

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"sync"

	lru "github.com/hashicorp/golang-lru/v2"
	"github.com/google/uuid"
)

// DiskFileCache is a byte-bounded on-disk LRU cache for provider file downloads.
// Files are stored under a configurable directory, named by the SHA-256 of their
// cache key. LRU eviction is automatic when the total size would exceed MaxBytes.
type DiskFileCache struct {
	dir      string
	maxBytes int64

	mu         sync.Mutex
	totalBytes int64
	lru        *lru.Cache[string, int64] // key → file size in bytes
}

// NewDiskFileCache creates (or reopens) a cache rooted at dir.
// maxBytes is the soft upper bound; a single file larger than maxBytes is still
// cached (it replaces everything else).
func NewDiskFileCache(dir string, maxBytes int64) (*DiskFileCache, error) {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, fmt.Errorf("filecache: mkdir %s: %w", dir, err)
	}

	c := &DiskFileCache{dir: dir, maxBytes: maxBytes}

	// evict callback — called by lru when an entry is removed
	var err error
	c.lru, err = lru.NewWithEvict[string, int64](1<<30 /* entry limit irrelevant */, c.onEvict)
	if err != nil {
		return nil, fmt.Errorf("filecache: create lru: %w", err)
	}

	c.rebuild()
	return c, nil
}

// Get opens the cached file for key (providerID, remoteID).
// Returns (nil, false) on a cache miss.
func (c *DiskFileCache) Get(providerID, remoteID uuid.UUID) (io.ReadCloser, bool) {
	key := cacheKey(providerID, remoteID)
	c.mu.Lock()
	_, ok := c.lru.Get(key) // promotes to MRU
	c.mu.Unlock()
	if !ok {
		return nil, false
	}

	f, err := os.Open(c.filePath(key))
	if err != nil {
		// File disappeared from disk — remove the stale index entry
		c.mu.Lock()
		if sz, exists := c.lru.Peek(key); exists {
			c.totalBytes -= sz
			c.lru.Remove(key)
		}
		c.mu.Unlock()
		return nil, false
	}
	return f, true
}

// Put writes r into the cache under (providerID, remoteID).
// size is used for byte accounting; if unknown pass ≤0 and the actual file size
// will be measured after writing.
func (c *DiskFileCache) Put(providerID, remoteID uuid.UUID, r io.Reader, size int64) error {
	key := cacheKey(providerID, remoteID)
	path := c.filePath(key)

	f, err := os.CreateTemp(c.dir, "tmp-*")
	if err != nil {
		return fmt.Errorf("filecache: create temp: %w", err)
	}
	tmpPath := f.Name()

	written, err := io.Copy(f, r)
	f.Close()
	if err != nil {
		os.Remove(tmpPath)
		return fmt.Errorf("filecache: write: %w", err)
	}

	actualSize := written
	if size > 0 {
		actualSize = size
	}

	c.mu.Lock()
	// Remove old entry first (onEvict deletes the old file at path — that's fine,
	// the new file is still at tmpPath and we rename it into place below).
	if _, exists := c.lru.Peek(key); exists {
		c.lru.Remove(key) // triggers onEvict: decrements totalBytes, deletes old file
	}

	// Evict LRU entries until there is room
	for c.maxBytes > 0 && c.totalBytes+actualSize > c.maxBytes {
		if _, _, ok := c.lru.RemoveOldest(); !ok {
			break
		}
	}

	// Rename after LRU manipulation so the new file lands after any eviction of path
	if err := os.Rename(tmpPath, path); err != nil {
		c.mu.Unlock()
		os.Remove(tmpPath)
		return fmt.Errorf("filecache: rename: %w", err)
	}

	c.lru.Add(key, actualSize)
	c.totalBytes += actualSize
	c.mu.Unlock()
	return nil
}

// Evict removes a specific file from the cache.
func (c *DiskFileCache) Evict(providerID, remoteID uuid.UUID) {
	key := cacheKey(providerID, remoteID)
	c.mu.Lock()
	defer c.mu.Unlock()
	c.lru.Remove(key) // triggers onEvict
}

// Stats returns the current byte usage and entry count.
func (c *DiskFileCache) Stats() (totalBytes int64, entries int) {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.totalBytes, c.lru.Len()
}

// onEvict is called by the LRU when an entry is removed. Must not acquire c.mu.
func (c *DiskFileCache) onEvict(key string, size int64) {
	c.totalBytes -= size
	if err := os.Remove(c.filePath(key)); err != nil && !os.IsNotExist(err) {
		slog.Warn("filecache: evict remove failed", "key", key, "error", err)
	}
}

// rebuild scans the cache dir on startup and repopulates the in-memory index.
func (c *DiskFileCache) rebuild() {
	entries, err := os.ReadDir(c.dir)
	if err != nil {
		return
	}
	for _, e := range entries {
		if e.IsDir() || len(e.Name()) != 64 { // SHA-256 hex = 64 chars
			continue
		}
		info, err := e.Info()
		if err != nil {
			continue
		}
		sz := info.Size()
		c.lru.Add(e.Name(), sz)
		c.totalBytes += sz
	}
}

func (c *DiskFileCache) filePath(key string) string {
	return filepath.Join(c.dir, key)
}

func cacheKey(providerID, remoteID uuid.UUID) string {
	h := sha256.Sum256([]byte(providerID.String() + ":" + remoteID.String()))
	return hex.EncodeToString(h[:])
}
