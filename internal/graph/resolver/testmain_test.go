package resolver

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"testing"
	"time"

	"entgo.io/ent/dialect"
	entsql "entgo.io/ent/dialect/sql"
	_ "github.com/jackc/pgx/v5/stdlib"
	tc "github.com/testcontainers/testcontainers-go"
	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"

	"github.com/drivebase/drivebase/internal/config"
	"github.com/drivebase/drivebase/internal/ent"
)

// sharedDB and sharedCfg are initialised once in TestMain and reused by all tests.
var (
	sharedDB  *ent.Client
	sharedCfg *config.Config
)

func TestMain(m *testing.M) {
	ctx := context.Background()

	pgCtr, err := tcpostgres.Run(ctx,
		"postgres:17-alpine",
		tcpostgres.WithDatabase("drivebase_test"),
		tcpostgres.WithUsername("test"),
		tcpostgres.WithPassword("test"),
		tc.WithWaitStrategy(
			wait.ForAll(
				wait.ForLog("database system is ready to accept connections").
					WithOccurrence(2).
					WithStartupTimeout(60*time.Second),
				wait.ForListeningPort("5432/tcp").
					WithStartupTimeout(60*time.Second),
			),
		),
	)
	if err != nil {
		fmt.Fprintf(os.Stderr, "start postgres container: %v\n", err)
		os.Exit(1)
	}
	defer func() { _ = tc.TerminateContainer(pgCtr) }()

	dsn, err := pgCtr.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		fmt.Fprintf(os.Stderr, "postgres connection string: %v\n", err)
		os.Exit(1)
	}

	sqlDB, err := sql.Open("pgx", dsn)
	if err != nil {
		fmt.Fprintf(os.Stderr, "open sql db: %v\n", err)
		os.Exit(1)
	}
	defer sqlDB.Close()

	sharedDB = ent.NewClient(ent.Driver(entsql.OpenDB(dialect.Postgres, sqlDB)))
	defer sharedDB.Close()

	if err := sharedDB.Schema.Create(ctx); err != nil {
		fmt.Fprintf(os.Stderr, "schema create: %v\n", err)
		os.Exit(1)
	}

	sharedCfg = &config.Config{
		Auth: config.AuthConfig{
			JWTSecret:      "test-jwt-secret-at-least-32-chars-xx",
			AccessTokenTTL: 15 * time.Minute,
		},
		Crypto: config.CryptoConfig{
			EncryptionKey: testEncryptionKey,
		},
		Server: config.ServerConfig{
			OAuthCallbackURL: "http://localhost:8080/api/v1/oauth/callback",
		},
	}

	os.Exit(m.Run())
}
