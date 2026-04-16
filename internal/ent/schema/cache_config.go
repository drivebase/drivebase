package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/dialect/entsql"
	"github.com/google/uuid"
)

// CacheConfig holds per-provider cache settings.
type CacheConfig struct {
	ent.Schema
}

func (CacheConfig) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.UUID("provider_id", uuid.UUID{}),
		field.Bool("enabled").Default(true),
		// max_size_bytes: 0 means unlimited
		field.Int64("max_size_bytes").Default(0),
		// ttl_seconds for Redis file-tree cache entries
		field.Int("ttl_seconds").Default(300), // 5 minutes
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
	}
}

func (CacheConfig) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("provider", Provider.Type).Ref("cache_config").Field("provider_id").Unique().Required().Annotations(entsql.OnDelete(entsql.Cascade)),
	}
}
