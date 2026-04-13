package cache

import (
	"context"
	"fmt"

	"github.com/drivebase/drivebase/internal/config"
	"github.com/redis/go-redis/v9"
)

// NewRedisClient creates a Redis client from config and pings the server.
func NewRedisClient(cfg config.RedisConfig) (*redis.Client, error) {
	opts, err := redis.ParseURL(cfg.URL)
	if err != nil {
		return nil, fmt.Errorf("cache: invalid redis URL: %w", err)
	}
	client := redis.NewClient(opts)

	if err := client.Ping(context.Background()).Err(); err != nil {
		return nil, fmt.Errorf("cache: redis ping failed: %w", err)
	}
	return client, nil
}
