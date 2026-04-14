package main

import (
	"context"
	"database/sql"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"entgo.io/ent/dialect"
	entsql "entgo.io/ent/dialect/sql"
	"github.com/jackc/pgx/v5/pgxpool"
	"gopkg.in/natefinch/lumberjack.v2"

	"github.com/drivebase/drivebase/internal/cache"
	"github.com/drivebase/drivebase/internal/config"
	"github.com/drivebase/drivebase/internal/ent"
	"github.com/drivebase/drivebase/internal/server"
	"github.com/drivebase/drivebase/internal/sharing"
	"github.com/drivebase/drivebase/internal/worker"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "config error: %v\n", err)
		os.Exit(1)
	}

	// Configure structured logging
	level := parseLogLevel(cfg.Log.Level)
	opts := &slog.HandlerOptions{Level: level}

	// Console handler: JSON in production/json mode, text otherwise
	var consoleHandler slog.Handler
	if cfg.Log.Format == "json" || cfg.Server.Env == "production" {
		consoleHandler = slog.NewJSONHandler(os.Stdout, opts)
	} else {
		consoleHandler = slog.NewTextHandler(os.Stdout, opts)
	}

	// File handler: always JSON, with rotation via lumberjack
	var logHandler slog.Handler
	if cfg.Log.File != "" {
		rotator := &lumberjack.Logger{
			Filename:   cfg.Log.File,
			MaxSize:    cfg.Log.MaxSizeMB,  // MB
			MaxBackups: cfg.Log.MaxBackups,
			MaxAge:     cfg.Log.MaxAgeDays, // days
			Compress:   true,               // gzip rotated files
		}
		fileHandler := slog.NewJSONHandler(rotator, opts)
		logHandler = &teeHandler{handlers: []slog.Handler{consoleHandler, fileHandler}}
	} else {
		logHandler = consoleHandler
	}

	slog.SetDefault(slog.New(logHandler))

	if cfg.Log.File != "" {
		slog.Info("file logging enabled", "path", cfg.Log.File,
			"max_size_mb", cfg.Log.MaxSizeMB,
			"max_backups", cfg.Log.MaxBackups,
			"max_age_days", cfg.Log.MaxAgeDays)
	}

	ctx := context.Background()

	// Ent client (pgx stdlib driver, postgres dialect)
	sqlDB, err := sql.Open("pgx", cfg.Database.DSN)
	if err != nil {
		slog.Error("failed to open database", "error", err)
		os.Exit(1)
	}
	client := ent.NewClient(ent.Driver(entsql.OpenDB(dialect.Postgres, sqlDB)))
	defer client.Close()

	// Auto-migrate (dev mode — switch to Atlas versioned migrations before prod)
	if err := client.Schema.Create(ctx); err != nil {
		slog.Error("failed to run auto-migration", "error", err)
		os.Exit(1)
	}
	slog.Info("database schema up to date")

	// Redis (optional — cache/bandwidth disabled if Redis unavailable)
	rdb, err := cache.NewRedisClient(cfg.Redis)
	if err != nil {
		slog.Warn("redis unavailable — file tree cache and bandwidth tracking disabled", "error", err)
		rdb = nil
	} else {
		slog.Info("redis connected")
	}

	// pgxpool for River (River requires a pgxpool, not the stdlib driver)
	pgPool, err := pgxpool.New(ctx, cfg.Database.DSN)
	if err != nil {
		slog.Error("failed to create pgx pool for River", "error", err)
		os.Exit(1)
	}
	defer pgPool.Close()

	// Build bandwidth counter (nil-safe if Redis is unavailable)
	var bwCounter *cache.BandwidthCounter
	if rdb != nil {
		bwCounter = cache.NewBandwidthCounter(rdb)
	}

	// River worker pool — also returns the wired transfer.Engine
	workerPool, transferEngine, err := worker.New(ctx, pgPool, client, cfg.Crypto.EncryptionKey, bwCounter)
	if err != nil {
		slog.Error("failed to create River worker pool", "error", err)
		os.Exit(1)
	}

	if err := workerPool.Start(ctx); err != nil {
		slog.Error("failed to start River worker pool", "error", err)
		os.Exit(1)
	}
	slog.Info("River worker pool started")

	sharingSvc := &sharing.Service{DB: client}

	addr := fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port)
	srv := &http.Server{
		Addr:         addr,
		Handler:      server.New(cfg, client, rdb, transferEngine, sharingSvc),
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// Graceful shutdown
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		slog.Info("server starting", "addr", addr, "env", cfg.Server.Env)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	<-stop
	slog.Info("shutting down...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("shutdown error", "error", err)
	}
	if err := workerPool.Stop(shutdownCtx); err != nil {
		slog.Error("worker pool stop error", "error", err)
	}
}

func parseLogLevel(s string) slog.Level {
	switch s {
	case "debug":
		return slog.LevelDebug
	case "warn":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

// teeHandler fans out slog records to multiple handlers simultaneously.
// Used to write to both stdout and a rotating log file.
type teeHandler struct {
	handlers []slog.Handler
}

func (t *teeHandler) Enabled(ctx context.Context, level slog.Level) bool {
	for _, h := range t.handlers {
		if h.Enabled(ctx, level) {
			return true
		}
	}
	return false
}

func (t *teeHandler) Handle(ctx context.Context, r slog.Record) error {
	var last error
	for _, h := range t.handlers {
		if h.Enabled(ctx, r.Level) {
			if err := h.Handle(ctx, r.Clone()); err != nil {
				last = err
			}
		}
	}
	return last
}

func (t *teeHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	hs := make([]slog.Handler, len(t.handlers))
	for i, h := range t.handlers {
		hs[i] = h.WithAttrs(attrs)
	}
	return &teeHandler{handlers: hs}
}

func (t *teeHandler) WithGroup(name string) slog.Handler {
	hs := make([]slog.Handler, len(t.handlers))
	for i, h := range t.handlers {
		hs[i] = h.WithGroup(name)
	}
	return &teeHandler{handlers: hs}
}

// ensure teeHandler satisfies slog.Handler at compile time
var _ slog.Handler = (*teeHandler)(nil)

// ensure lumberjack satisfies io.WriteCloser at compile time (documents intent)
var _ io.WriteCloser = (*lumberjack.Logger)(nil)
