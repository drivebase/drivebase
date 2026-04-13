package resolver

import (
	"github.com/drivebase/drivebase/internal/config"
	"github.com/drivebase/drivebase/internal/ent"
)

// Resolver is the root GraphQL resolver. All dependencies are injected here.
// Additional fields (Redis, storage registry, River) will be added in later phases.
type Resolver struct {
	DB     *ent.Client
	Config *config.Config
}
