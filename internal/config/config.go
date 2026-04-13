package config

import (
	"fmt"
	"strings"
	"time"

	"github.com/spf13/viper"
)

type Config struct {
	Server    ServerConfig
	Database  DatabaseConfig
	Redis     RedisConfig
	Auth      AuthConfig
	Crypto    CryptoConfig
	Cache     CacheConfig
	Worker    WorkerConfig
	Log       LogConfig
}

type ServerConfig struct {
	Host string
	Port int
	Env  string // "development" | "production"
}

type DatabaseConfig struct {
	DSN string
}

type RedisConfig struct {
	URL string
}

type AuthConfig struct {
	JWTSecret          string
	AccessTokenTTL     time.Duration
	RefreshTokenTTL    time.Duration
}

type CryptoConfig struct {
	EncryptionKey string // 32-char key for AES-256-GCM
}

type CacheConfig struct {
	DiskPath    string
	DefaultTTL  time.Duration
}

type WorkerConfig struct {
	Concurrency int
}

type LogConfig struct {
	Level  string // "debug" | "info" | "warn" | "error"
	Format string // "text" | "json"
}

func Load() (*Config, error) {
	v := viper.New()

	// Defaults
	v.SetDefault("server.host", "0.0.0.0")
	v.SetDefault("server.port", 8080)
	v.SetDefault("server.env", "development")
	v.SetDefault("database.dsn", "postgres://drivebase:drivebase@localhost:5432/drivebase?sslmode=disable")
	v.SetDefault("redis.url", "redis://localhost:6379/0")
	v.SetDefault("auth.access_token_ttl", "15m")
	v.SetDefault("auth.refresh_token_ttl", "168h") // 7 days
	v.SetDefault("cache.disk_path", "/tmp/drivebase/cache")
	v.SetDefault("cache.default_ttl", "5m")
	v.SetDefault("worker.concurrency", 10)
	v.SetDefault("log.level", "info")
	v.SetDefault("log.format", "text")

	// Config file: config.toml (optional, env vars take precedence)
	v.SetConfigName("config")
	v.SetConfigType("toml")
	v.AddConfigPath(".")
	v.AddConfigPath("/etc/drivebase")
	_ = v.ReadInConfig() // optional — missing file is fine

	// Env vars override config file: DRIVEBASE_SERVER_PORT, etc.
	v.SetEnvPrefix("DRIVEBASE")
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()

	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("unmarshal config: %w", err)
	}

	if cfg.Auth.JWTSecret == "" {
		return nil, fmt.Errorf("DRIVEBASE_AUTH_JWTSECRET is required")
	}
	if cfg.Crypto.EncryptionKey == "" {
		return nil, fmt.Errorf("DRIVEBASE_CRYPTO_ENCRYPTIONKEY is required")
	}
	if len(cfg.Crypto.EncryptionKey) < 32 {
		return nil, fmt.Errorf("DRIVEBASE_CRYPTO_ENCRYPTIONKEY must be at least 32 characters")
	}

	return &cfg, nil
}
