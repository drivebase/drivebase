package cache

import (
	"context"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestCache(t *testing.T) *FileTreeCache {
	t.Helper()
	mr, err := miniredis.Run()
	require.NoError(t, err)
	t.Cleanup(mr.Close)

	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	return NewFileTreeCache(rdb, 5*time.Minute)
}

func TestFileTreeCache_SetAndGet(t *testing.T) {
	c := newTestCache(t)
	ctx := context.Background()
	providerID := uuid.New()

	listing := &CachedListing{
		Files: []CachedFile{
			{RemoteID: "file1", Name: "doc.txt", IsDir: false, Size: 1024},
			{RemoteID: "folder1", Name: "Photos", IsDir: true},
		},
	}

	require.NoError(t, c.Set(ctx, providerID, "", listing))

	got, err := c.Get(ctx, providerID, "")
	require.NoError(t, err)
	require.NotNil(t, got)
	assert.Len(t, got.Files, 2)
	assert.Equal(t, "doc.txt", got.Files[0].Name)
	assert.Equal(t, "Photos", got.Files[1].Name)
	assert.True(t, got.Files[1].IsDir)
}

func TestFileTreeCache_Miss(t *testing.T) {
	c := newTestCache(t)
	ctx := context.Background()

	got, err := c.Get(ctx, uuid.New(), "nonexistent")
	require.NoError(t, err)
	assert.Nil(t, got)
}

func TestFileTreeCache_Invalidate(t *testing.T) {
	c := newTestCache(t)
	ctx := context.Background()
	providerID := uuid.New()

	listing := &CachedListing{Files: []CachedFile{{RemoteID: "f1", Name: "test.txt"}}}
	require.NoError(t, c.Set(ctx, providerID, "parent1", listing))

	// Confirm it's cached
	got, err := c.Get(ctx, providerID, "parent1")
	require.NoError(t, err)
	require.NotNil(t, got)

	// Invalidate
	require.NoError(t, c.Invalidate(ctx, providerID, "parent1"))

	// Should be gone
	got, err = c.Get(ctx, providerID, "parent1")
	require.NoError(t, err)
	assert.Nil(t, got)
}

func TestFileTreeCache_InvalidateProvider(t *testing.T) {
	c := newTestCache(t)
	ctx := context.Background()
	providerID := uuid.New()

	listing := &CachedListing{Files: []CachedFile{{RemoteID: "f1", Name: "a.txt"}}}
	require.NoError(t, c.Set(ctx, providerID, "", listing))
	require.NoError(t, c.Set(ctx, providerID, "parent1", listing))
	require.NoError(t, c.Set(ctx, providerID, "parent2", listing))

	require.NoError(t, c.InvalidateProvider(ctx, providerID))

	for _, parent := range []string{"", "parent1", "parent2"} {
		got, err := c.Get(ctx, providerID, parent)
		require.NoError(t, err)
		assert.Nil(t, got, "expected cache miss for parent=%q", parent)
	}
}

func TestFileTreeCache_TTL(t *testing.T) {
	mr, err := miniredis.Run()
	require.NoError(t, err)
	t.Cleanup(mr.Close)

	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	c := NewFileTreeCache(rdb, 1*time.Second)
	ctx := context.Background()
	providerID := uuid.New()

	listing := &CachedListing{Files: []CachedFile{{RemoteID: "f1", Name: "ttl.txt"}}}
	require.NoError(t, c.Set(ctx, providerID, "", listing))

	// Fast-forward time in miniredis
	mr.FastForward(2 * time.Second)

	got, err := c.Get(ctx, providerID, "")
	require.NoError(t, err)
	assert.Nil(t, got, "expected cache miss after TTL expiry")
}
