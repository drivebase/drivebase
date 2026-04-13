# Caching

## Overview

Three distinct caching layers exist, each serving a different purpose:

| Layer | Backend | What it caches | Invalidation |
|---|---|---|---|
| File tree cache | Redis | Directory listings from storage providers | Explicit + TTL |
| Bandwidth counters | Redis | Per-provider upload/download byte counts | Hourly flush to DB |
| Disk file cache | Local filesystem | Downloaded file bodies | LRU eviction |

All three degrade gracefully — if Redis is unavailable at startup, the file tree cache and bandwidth tracking are disabled but the API continues working normally. The disk file cache is independent of Redis.

## File Tree Cache

### Purpose

Listing files from a remote storage provider (S3, Google Drive) involves an API call with meaningful latency. The file tree cache stores directory listings in Redis so that repeated browses of the same folder return instantly.

### Key Format

```
filetree:{providerID}:{parentRemoteID}
```

The `parentRemoteID` is the provider's own identifier for the folder being listed. For the root directory it is an empty string `""`.

### What's Stored

Each cache entry is a serialized `CachedListing` containing the files in that folder (remote IDs, names, sizes, types, timestamps) and a next-page token if the listing was paginated. The full `FileInfo` for each file is stored so the cache hit returns a complete result.

### TTL and Invalidation

The TTL is configurable (default 5 minutes). Beyond TTL-based expiry, two explicit invalidation paths exist:

- `InvalidateFolder(providerID, parentRemoteID)` — called after rename, move, delete, or upload operations that change a folder's contents
- `InvalidateProvider(providerID)` — called when a provider's credentials change or it is disconnected; clears all cached folders for that provider

Explicit invalidation ensures users see fresh listings immediately after mutations rather than waiting for TTL expiry.

### Cache Miss Behavior

On a cache miss, `listFiles` falls through to the provider's live API, runs the background DB upsert, and then populates the cache. The first request after TTL expiry has provider-API latency; subsequent requests within the TTL window are served from Redis.

## Bandwidth Counters

### Purpose

Track how many bytes are uploaded and downloaded per provider per workspace per hour, without a DB write on every file transfer. Redis INCRBY is atomic and extremely fast. The hourly buckets are periodically flushed to the `BandwidthLog` PostgreSQL table for persistent storage and querying.

### Key Format

```
bw:{workspaceID}:{providerID}:{direction}:{YYYY-MM-DD-HH}
```

Where `direction` is `upload` or `download`. The timestamp component is the current UTC hour.

### Operations

`IncrUpload(workspaceID, providerID, bytes)` and `IncrDownload(workspaceID, providerID, bytes)` both issue a Redis INCRBY against the current hour's key. Each key has a 25-hour TTL, which means any key not flushed within 25 hours is automatically expired (prevents unbounded Redis growth if the flush job is down).

### Flush Process

The `bandwidth_flush` River job runs hourly:

1. Scan all keys matching `bw:*`
2. Parse each key to extract the time period
3. Skip keys for the current hour (still accumulating data)
4. For each past-hour key, issue `GETDEL` — atomically reads the value and deletes the key in one operation, preventing double-counting
5. Write a `BandwidthLog` row for each non-zero result
6. The `BandwidthLog` rows are queryable via `bandwidthUsage(workspaceID, providerID, from, to)`

The `GETDEL` atomicity is important: if the flush job runs multiple times concurrently (unlikely but possible), each key is only counted once.

## Disk File Cache

### Purpose

Cache downloaded file bodies on the local filesystem so that repeated downloads of the same file do not require a round trip to the storage provider. Primarily useful when the API server and the storage backend are geographically separated, or when rate-limited access to an API (e.g. Google Drive) needs to be conserved.

### Key Scheme

Cache files are stored on disk using a hex-encoded SHA-256 hash of `"{providerID}:{remoteID}"` as the filename. This gives a deterministic, collision-resistant key that maps a (provider, file) pair to a single cache file path.

### Byte-Bounded LRU Eviction

The cache is bounded by total bytes, not by number of entries. When a `Put` would exceed the configured maximum:

1. Entries are evicted in LRU order (least recently accessed first)
2. Each eviction calls `os.Remove` on the corresponding cache file
3. The byte counter is decremented by the evicted entry's size
4. Eviction continues until there is enough room for the new entry

An in-memory LRU index (`hashicorp/golang-lru/v2`) tracks recency and size. On startup, the cache directory is scanned to rebuild this index from existing files, so the cache survives process restarts.

### Operations

- **Get**: Looks up the key in the LRU index. On hit, opens the file and promotes it to most-recently-used. On miss, returns `(nil, false)`.
- **Put**: Writes to a temp file first, then acquires the mutex and performs the LRU bookkeeping (evict old entry if overwriting, evict LRU entries if over capacity), then atomically renames the temp file to the final path. This order ensures the file is never partially written at the final path.
- **Evict**: Removes a specific entry by key — used when a file is deleted or updated upstream.
- **Stats**: Returns total bytes used and number of cached entries.

### When to Use

The disk file cache is opt-in via config (`cache.disk_path` and `cache.max_bytes`). If not configured, `DiskFileCache` is nil and the download handler skips the cache entirely.

Reads check the cache before calling `provider.Download()`. Writes populate the cache after a successful download (the response body is tee'd to both the cache and the HTTP response writer simultaneously via `io.TeeReader` or similar — check implementation for exact approach).
