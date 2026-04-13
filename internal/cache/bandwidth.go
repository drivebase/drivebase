package cache

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

// BandwidthCounter tracks upload/download bytes in Redis.
// Keys are hourly buckets: bw:{workspaceID}:{providerID}:{direction}:{YYYY-MM-DD-HH}
type BandwidthCounter struct {
	rdb *redis.Client
	ttl time.Duration
}

func NewBandwidthCounter(rdb *redis.Client) *BandwidthCounter {
	return &BandwidthCounter{rdb: rdb, ttl: 25 * time.Hour}
}

// BandwidthEntry is a flushed counter ready to write to bandwidth_log.
type BandwidthEntry struct {
	WorkspaceID uuid.UUID
	ProviderID  uuid.UUID
	Direction   string
	Bytes       int64
	PeriodStart time.Time
	PeriodEnd   time.Time
}

func (c *BandwidthCounter) IncrUpload(ctx context.Context, workspaceID, providerID uuid.UUID, bytes int64) error {
	return c.incr(ctx, workspaceID, providerID, "upload", bytes)
}

func (c *BandwidthCounter) IncrDownload(ctx context.Context, workspaceID, providerID uuid.UUID, bytes int64) error {
	return c.incr(ctx, workspaceID, providerID, "download", bytes)
}

func (c *BandwidthCounter) incr(ctx context.Context, workspaceID, providerID uuid.UUID, direction string, bytes int64) error {
	key := c.key(workspaceID, providerID, direction, time.Now())
	pipe := c.rdb.Pipeline()
	pipe.IncrBy(ctx, key, bytes)
	pipe.Expire(ctx, key, c.ttl)
	_, err := pipe.Exec(ctx)
	return err
}

func (c *BandwidthCounter) key(workspaceID, providerID uuid.UUID, direction string, t time.Time) string {
	period := t.UTC().Format("2006-01-02-15")
	return fmt.Sprintf("bw:%s:%s:%s:%s", workspaceID, providerID, direction, period)
}

// FlushCounters reads all bandwidth keys, returns entries, and deletes the keys atomically.
// Keys from the current hour are skipped (still accumulating).
func (c *BandwidthCounter) FlushCounters(ctx context.Context) ([]BandwidthEntry, error) {
	keys, err := c.rdb.Keys(ctx, "bw:*").Result()
	if err != nil {
		return nil, fmt.Errorf("bandwidth flush: scan keys: %w", err)
	}

	currentPeriod := time.Now().UTC().Format("2006-01-02-15")
	var entries []BandwidthEntry

	for _, key := range keys {
		parts := strings.SplitN(key, ":", 5)
		if len(parts) != 5 {
			continue
		}
		period := parts[4]
		// Skip current hour — it's still accumulating
		if period == currentPeriod {
			continue
		}

		wsID, err := uuid.Parse(parts[1])
		if err != nil {
			continue
		}
		provID, err := uuid.Parse(parts[2])
		if err != nil {
			continue
		}
		direction := parts[3]

		val, err := c.rdb.GetDel(ctx, key).Result()
		if err == redis.Nil {
			continue
		}
		if err != nil {
			return nil, fmt.Errorf("bandwidth flush: get %s: %w", key, err)
		}

		bytes, err := strconv.ParseInt(val, 10, 64)
		if err != nil || bytes == 0 {
			continue
		}

		periodStart, err := time.ParseInLocation("2006-01-02-15", period, time.UTC)
		if err != nil {
			continue
		}

		entries = append(entries, BandwidthEntry{
			WorkspaceID: wsID,
			ProviderID:  provID,
			Direction:   direction,
			Bytes:       bytes,
			PeriodStart: periodStart,
			PeriodEnd:   periodStart.Add(time.Hour),
		})
	}
	return entries, nil
}
