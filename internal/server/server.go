package server

import (
	"net/http"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/handler/extension"
	"github.com/99designs/gqlgen/graphql/handler/transport"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/rs/cors"

	"github.com/drivebase/drivebase/internal/auth"
	"github.com/drivebase/drivebase/internal/cache"
	"github.com/drivebase/drivebase/internal/config"
	"github.com/drivebase/drivebase/internal/ent"
	"github.com/drivebase/drivebase/internal/graph"
	"github.com/drivebase/drivebase/internal/graph/resolver"
	"github.com/drivebase/drivebase/internal/sharing"
	"github.com/drivebase/drivebase/internal/transfer"
	"github.com/redis/go-redis/v9"
)

// New builds and returns the HTTP server mux.
// transferEngine is the wired transfer.Engine (with River dispatcher set by the worker pool).
func New(cfg *config.Config, db *ent.Client, rdb *redis.Client, transferEngine *transfer.Engine, sharingSvc *sharing.Service) http.Handler {
	r := chi.NewRouter()

	// Core middleware
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)
	r.Use(requestLogger)

	// CORS — permissive in dev, locked down in prod via config
	r.Use(cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type", "X-Workspace-ID", "X-Share-Token"},
		AllowCredentials: true,
	}).Handler)

	// Auth middleware — injects user into context if Bearer token present
	r.Use(auth.Extractor(cfg.Auth.JWTSecret, db))

	// Share token middleware — injects SharedLink into context if X-Share-Token present
	r.Use(sharing.Extractor(sharingSvc))

	// Inject HTTP request into context (resolvers use it for IP/UA)
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			ctx := resolver.WithHTTPRequest(req.Context(), req)
			next.ServeHTTP(w, req.WithContext(ctx))
		})
	})

	// Health check
	r.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	// GraphQL
	gqlSrv := newGQLServer(cfg, db, rdb, transferEngine, sharingSvc)
	r.Handle("/graphql", gqlSrv)

	// Playground (dev only)
	if cfg.Server.Env != "production" {
		r.Handle("/playground", playground.Handler("Drivebase", "/graphql"))
	}

	// REST file endpoints
	h := &fileHandler{cfg: cfg, db: db}
	r.Post("/api/v1/upload", h.upload)
	r.Get("/api/v1/download/{fileNodeID}", h.download)

	return r
}

func newGQLServer(cfg *config.Config, db *ent.Client, rdb *redis.Client, transferEngine *transfer.Engine, sharingSvc *sharing.Service) *handler.Server {
	var fileCache *cache.FileTreeCache
	if rdb != nil {
		fileCache = cache.NewFileTreeCache(rdb, cfg.Cache.FileCacheTTL)
	}

	srv := handler.New(graph.NewExecutableSchema(graph.Config{
		Resolvers: &resolver.Resolver{
			DB:        db,
			Config:    cfg,
			Redis:     rdb,
			FileCache: fileCache,
			Transfer:  transferEngine,
			Sharing:   sharingSvc,
		},
	}))

	// Transports
	srv.AddTransport(transport.Options{})
	srv.AddTransport(transport.GET{})
	srv.AddTransport(transport.POST{})
	srv.AddTransport(transport.MultipartForm{})

	// Enable introspection in non-production
	if cfg.Server.Env != "production" {
		srv.Use(extension.Introspection{})
	}

	return srv
}
