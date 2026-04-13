// Package e2e runs full end-to-end flows against a real server backed by
// real Postgres, Redis, and MinIO containers spun up via testcontainers.
// Run with: go test ./e2e/... -v -timeout 5m
package e2e

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	awss3 "github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"
	tc "github.com/testcontainers/testcontainers-go"
	tcminio "github.com/testcontainers/testcontainers-go/modules/minio"
	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
	tcredis "github.com/testcontainers/testcontainers-go/modules/redis"
	"github.com/testcontainers/testcontainers-go/wait"

	_ "github.com/jackc/pgx/v5/stdlib"

	"entgo.io/ent/dialect"
	entsql "entgo.io/ent/dialect/sql"

	"github.com/drivebase/drivebase/internal/cache"
	"github.com/drivebase/drivebase/internal/config"
	"github.com/drivebase/drivebase/internal/ent"
	"github.com/drivebase/drivebase/internal/server"
	"github.com/drivebase/drivebase/internal/sharing"
	"github.com/drivebase/drivebase/internal/transfer"
)

// suite holds all shared state for the E2E test run.
type suite struct {
	srv        *httptest.Server
	cfg        *config.Config
	minioCreds s3Creds
}

type s3Creds struct {
	Endpoint  string
	AccessKey string
	SecretKey string
	Bucket    string
}

// s3CredsJSON returns the JSON blob used to connect an S3 provider.
func (s *suite) s3CredsJSON() string {
	b, _ := json.Marshal(map[string]any{
		"endpoint":       s.minioCreds.Endpoint,
		"region":         "us-east-1",
		"bucket":         s.minioCreds.Bucket,
		"access_key":     s.minioCreds.AccessKey,
		"secret_key":     s.minioCreds.SecretKey,
		"use_path_style": true,
	})
	return string(b)
}

// setupSuite starts all containers, migrates the DB, and starts the HTTP server.
// Cleanup is registered via t.Cleanup.
func setupSuite(t *testing.T) *suite {
	t.Helper()
	ctx := context.Background()

	// ── Postgres ─────────────────────────────────────────────────────────────
	pgCtr, err := tcpostgres.Run(ctx,
		"postgres:17-alpine",
		tcpostgres.WithDatabase("drivebase"),
		tcpostgres.WithUsername("drivebase"),
		tcpostgres.WithPassword("drivebase"),
		tc.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithStartupTimeout(60*time.Second),
		),
	)
	require.NoError(t, err)
	t.Cleanup(func() { _ = tc.TerminateContainer(pgCtr) })

	pgDSN, err := pgCtr.ConnectionString(ctx, "sslmode=disable")
	require.NoError(t, err)

	// ── Redis ─────────────────────────────────────────────────────────────────
	redisCtr, err := tcredis.Run(ctx, "redis:7-alpine")
	require.NoError(t, err)
	t.Cleanup(func() { _ = tc.TerminateContainer(redisCtr) })

	redisURL, err := redisCtr.ConnectionString(ctx)
	require.NoError(t, err)

	// ── MinIO ─────────────────────────────────────────────────────────────────
	minioCtr, err := tcminio.Run(ctx, "minio/minio:latest",
		tcminio.WithUsername("minioadmin"),
		tcminio.WithPassword("minioadmin"),
	)
	require.NoError(t, err)
	t.Cleanup(func() { _ = tc.TerminateContainer(minioCtr) })

	minioHost, err := minioCtr.ConnectionString(ctx)
	require.NoError(t, err)
	minioURL := "http://" + minioHost

	const bucket = "e2e-test"
	createMinioBucket(t, ctx, minioURL, "minioadmin", "minioadmin", bucket)

	// ── Config ────────────────────────────────────────────────────────────────
	cfg := &config.Config{
		Server:   config.ServerConfig{Host: "127.0.0.1", Port: 0, Env: "test"},
		Database: config.DatabaseConfig{DSN: pgDSN},
		Redis:    config.RedisConfig{URL: redisURL},
		Auth: config.AuthConfig{
			JWTSecret:       "e2e-test-secret-key-32-chars-min!",
			AccessTokenTTL:  15 * time.Minute,
			RefreshTokenTTL: 7 * 24 * time.Hour,
		},
		Crypto: config.CryptoConfig{
			EncryptionKey: "e2e-test-encryption-key-32chars!",
		},
		Cache: config.CacheConfig{
			FileCacheTTL: 5 * time.Minute,
		},
	}

	// ── Ent + migrate ─────────────────────────────────────────────────────────
	sqlDB, err := sql.Open("pgx", pgDSN)
	require.NoError(t, err)
	entClient := ent.NewClient(ent.Driver(entsql.OpenDB(dialect.Postgres, sqlDB)))
	t.Cleanup(func() { _ = entClient.Close() })
	require.NoError(t, entClient.Schema.Create(ctx))

	// ── Redis client ──────────────────────────────────────────────────────────
	rOpts, err := redis.ParseURL(redisURL)
	require.NoError(t, err)
	rdb := redis.NewClient(rOpts)
	t.Cleanup(func() { _ = rdb.Close() })

	fileCache := cache.NewFileTreeCache(rdb, cfg.Cache.FileCacheTTL)
	_ = fileCache

	// ── Transfer engine (goroutine fallback — no River in E2E) ───────────────
	transferEngine := &transfer.Engine{DB: entClient, EncKey: cfg.Crypto.EncryptionKey}

	// ── Sharing service ───────────────────────────────────────────────────────
	sharingSvc := &sharing.Service{DB: entClient}

	// ── HTTP test server ──────────────────────────────────────────────────────
	srv := httptest.NewServer(server.New(cfg, entClient, rdb, transferEngine, sharingSvc))
	t.Cleanup(srv.Close)

	return &suite{
		srv: srv,
		cfg: cfg,
		minioCreds: s3Creds{
			Endpoint:  minioURL,
			AccessKey: "minioadmin",
			SecretKey: "minioadmin",
			Bucket:    bucket,
		},
	}
}

// createMinioBucket creates a bucket in the MinIO container.
func createMinioBucket(t *testing.T, ctx context.Context, endpoint, ak, sk, bucket string) {
	t.Helper()
	cfg, err := awsconfig.LoadDefaultConfig(ctx,
		awsconfig.WithRegion("us-east-1"),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(ak, sk, "")),
	)
	require.NoError(t, err)

	client := awss3.NewFromConfig(cfg, func(o *awss3.Options) {
		o.BaseEndpoint = aws.String(endpoint)
		o.UsePathStyle = true
	})
	_, err = client.CreateBucket(ctx, &awss3.CreateBucketInput{
		Bucket: aws.String(bucket),
	})
	require.NoError(t, err)
}
