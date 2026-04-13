package resolver

import (
	"github.com/drivebase/drivebase/internal/cache"
	"github.com/drivebase/drivebase/internal/config"
	"github.com/drivebase/drivebase/internal/ent"
	"github.com/drivebase/drivebase/internal/sharing"
	"github.com/drivebase/drivebase/internal/transfer"
	"github.com/redis/go-redis/v9"
)

// Resolver is the root GraphQL resolver. All dependencies are injected here.
type Resolver struct {
	DB        *ent.Client
	Config    *config.Config
	Redis     *redis.Client
	FileCache *cache.FileTreeCache
	Transfer  *transfer.Engine
	Sharing   *sharing.Service
}
