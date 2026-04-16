package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/dialect/entsql"
	"github.com/google/uuid"
)

// ProviderQuota stores storage quota and plan information for a provider.
// One row per provider, upserted whenever quota is refreshed.
type ProviderQuota struct {
	ent.Schema
}

func (ProviderQuota) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.UUID("provider_id", uuid.UUID{}).Unique(),
		// TotalBytes is 0 for unlimited plans.
		field.Int64("total_bytes").Default(0),
		field.Int64("used_bytes").Default(0),
		field.Int64("free_bytes").Default(0),
		// TrashBytes is space used by trashed files (provider-specific).
		field.Int64("trash_bytes").Default(0),
		// PlanName is a human-readable plan/tier label.
		field.String("plan_name").Optional(),
		// Extra holds provider-specific supplementary data (JSON).
		field.JSON("extra", map[string]any{}).Optional(),
		field.Time("synced_at").Default(time.Now),
	}
}

func (ProviderQuota) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("provider", Provider.Type).Ref("quota").Field("provider_id").Unique().Required().Annotations(entsql.OnDelete(entsql.Cascade)),
	}
}
