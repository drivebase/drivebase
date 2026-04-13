package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/drivebase/drivebase/internal/cache"
	"github.com/drivebase/drivebase/internal/config"
	"github.com/drivebase/drivebase/internal/ent"
	"github.com/drivebase/drivebase/internal/server"
	"github.com/drivebase/drivebase/internal/sharing"
	"github.com/drivebase/drivebase/internal/worker"

	"entgo.io/ent/dialect"
	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "config error: %v\n", err)
		os.Exit(1)
	}

	// Configure structured logging
	var logHandler slog.Handler
	level := parseLogLevel(cfg.Log.Level)
	opts := &slog.HandlerOptions{Level: level}
	if cfg.Log.Format == "json" || cfg.Server.Env == "production" {
		logHandler = slog.NewJSONHandler(os.Stdout, opts)
	} else {
		logHandler = slog.NewTextHandler(os.Stdout, opts)
	}
	slog.SetDefault(slog.New(logHandler))

	ctx := context.Background()

	// Ent client (uses pgx stdlib driver)
	client, err := ent.Open(dialect.Postgres, cfg.Database.DSN)
	if err != nil {
		slog.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
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
