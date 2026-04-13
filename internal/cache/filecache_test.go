package cache

import (
	"bytes"
	"io"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestDiskCache(t *testing.T, maxBytes int64) *DiskFileCache {
	t.Helper()
	c, err := NewDiskFileCache(t.TempDir(), maxBytes)
	require.NoError(t, err)
	return c
}

func TestDiskFileCache_missOnEmpty(t *testing.T) {
	c := newTestDiskCache(t, 10<<20)
	rc, ok := c.Get(uuid.New(), uuid.New())
	assert.False(t, ok)
	assert.Nil(t, rc)
}

func TestDiskFileCache_putAndGet(t *testing.T) {
	c := newTestDiskCache(t, 10<<20)
	pID, rID := uuid.New(), uuid.New()
	content := []byte("hello cache")

	err := c.Put(pID, rID, bytes.NewReader(content), int64(len(content)))
	require.NoError(t, err)

	rc, ok := c.Get(pID, rID)
	require.True(t, ok)
	defer rc.Close()

	got, err := io.ReadAll(rc)
	require.NoError(t, err)
	assert.Equal(t, content, got)
}

func TestDiskFileCache_stats(t *testing.T) {
	c := newTestDiskCache(t, 10<<20)
	pID, rID := uuid.New(), uuid.New()
	data := []byte("some data")

	require.NoError(t, c.Put(pID, rID, bytes.NewReader(data), int64(len(data))))

	total, entries := c.Stats()
	assert.Equal(t, int64(len(data)), total)
	assert.Equal(t, 1, entries)
}

func TestDiskFileCache_evict(t *testing.T) {
	c := newTestDiskCache(t, 10<<20)
	pID, rID := uuid.New(), uuid.New()

	require.NoError(t, c.Put(pID, rID, strings.NewReader("data"), 4))
	c.Evict(pID, rID)

	_, ok := c.Get(pID, rID)
	assert.False(t, ok)

	total, entries := c.Stats()
	assert.Equal(t, int64(0), total)
	assert.Equal(t, 0, entries)
}

func TestDiskFileCache_lruEviction(t *testing.T) {
	// maxBytes = 10; add 3 entries of 5 bytes each — first should be evicted
	c := newTestDiskCache(t, 10)

	p := uuid.New()
	r1, r2, r3 := uuid.New(), uuid.New(), uuid.New()

	require.NoError(t, c.Put(p, r1, strings.NewReader("AAAAA"), 5))
	require.NoError(t, c.Put(p, r2, strings.NewReader("BBBBB"), 5))
	// At this point: totalBytes == 10, at limit

	require.NoError(t, c.Put(p, r3, strings.NewReader("CCCCC"), 5))
	// r1 (LRU) should have been evicted to make room

	_, ok1 := c.Get(p, r1)
	_, ok2 := c.Get(p, r2)
	_, ok3 := c.Get(p, r3)

	assert.False(t, ok1, "r1 should have been evicted")
	assert.True(t, ok2, "r2 should still be present")
	assert.True(t, ok3, "r3 should be present")
}

func TestDiskFileCache_overwrite(t *testing.T) {
	c := newTestDiskCache(t, 10<<20)
	pID, rID := uuid.New(), uuid.New()

	require.NoError(t, c.Put(pID, rID, strings.NewReader("v1"), 2))
	require.NoError(t, c.Put(pID, rID, strings.NewReader("version2"), 8))

	rc, ok := c.Get(pID, rID)
	require.True(t, ok)
	defer rc.Close()

	got, _ := io.ReadAll(rc)
	assert.Equal(t, "version2", string(got))

	// Stats should reflect the new size, not old+new
	total, entries := c.Stats()
	assert.Equal(t, int64(8), total)
	assert.Equal(t, 1, entries)
}

func TestCacheKey_deterministic(t *testing.T) {
	p, r := uuid.New(), uuid.New()
	assert.Equal(t, cacheKey(p, r), cacheKey(p, r))
}

func TestCacheKey_unique(t *testing.T) {
	p := uuid.New()
	r1, r2 := uuid.New(), uuid.New()
	assert.NotEqual(t, cacheKey(p, r1), cacheKey(p, r2))
}
