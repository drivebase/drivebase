package config

import (
	"fmt"
	"strings"
	"time"

	"github.com/spf13/viper"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Redis    RedisConfig
	Auth     AuthConfig
	Crypto   CryptoConfig
	Cache    CacheConfig
	Worker   WorkerConfig
	Log      LogConfig
}

type ServerConfig struct {
	Host             string `mapstructure:"host"`
	Port             int    `mapstructure:"port"`
	Env              string `mapstructure:"env"`
	OAuthCallbackURL string `mapstructure:"oauth_callback_url"`
}

type DatabaseConfig struct {
	DSN string `mapstructure:"dsn"`
}

type RedisConfig struct {
	URL string `mapstructure:"url"`
}

type AuthConfig struct {
	JWTSecret       string        `mapstructure:"jwt_secret"`
	AccessTokenTTL  time.Duration `mapstructure:"access_token_ttl"`
	RefreshTokenTTL time.Duration `mapstructure:"refresh_token_ttl"`
}

type CryptoConfig struct {
	EncryptionKey string `mapstructure:"encryption_key"`
}

type CacheConfig struct {
	DiskPath     string        `mapstructure:"disk_path"`
	DefaultTTL   time.Duration `mapstructure:"default_ttl"`
	FileCacheTTL time.Duration `mapstructure:"file_cache_ttl"`
}

type WorkerConfig struct {
	Concurrency int `mapstructure:"concurrency"`
}

type LogConfig struct {
	Level      string `mapstructure:"level"`
	Format     string `mapstructure:"format"`
	File       string `mapstructure:"file"`
	MaxSizeMB  int    `mapstructure:"max_size_mb"`
	MaxBackups int    `mapstructure:"max_backups"`
	MaxAgeDays int    `mapstructure:"max_age_days"`
}

func Load() (*Config, error) {
	v := viper.New()

	// Defaults
	v.SetDefault("server.host", "0.0.0.0")
	v.SetDefault("server.port", 8080)
	v.SetDefault("server.env", "development")
	v.SetDefault("server.oauth_callback_url", "http://localhost:8080/api/v1/oauth/callback")
	v.SetDefault("database.dsn", "postgres://drivebase:drivebase@localhost:5432/drivebase?sslmode=disable")
	v.SetDefault("redis.url", "redis://localhost:6379/0")
	v.SetDefault("auth.access_token_ttl", "15m")
	v.SetDefault("auth.refresh_token_ttl", "168h") // 7 days
	v.SetDefault("cache.disk_path", "./data/cache")
	v.SetDefault("cache.default_ttl", "5m")
	v.SetDefault("worker.concurrency", 10)
	v.SetDefault("log.level", "info")
	v.SetDefault("log.format", "text")
	v.SetDefault("log.file", "")
	v.SetDefault("log.max_size_mb", 50)
	v.SetDefault("log.max_backups", 5)
	v.SetDefault("log.max_age_days", 30)

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
