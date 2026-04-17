package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/drivebase/drivebase/internal/apitoken"
	"github.com/google/uuid"
)

type ApiToken struct {
	ent.Schema
}

func (ApiToken) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.UUID("user_id", uuid.UUID{}),
		// Human-readable label (e.g. "CI Deploy Key", "Local Dev")
		field.String("name").NotEmpty(),
		// SHA-256 hex of the raw token — never store the raw token
		field.String("token_hash").Sensitive().Unique().NotEmpty(),
		// e.g. "drv_abc12345...wx9z" — safe to show in lists
		field.String("display_token").NotEmpty(),
		// Named scopes: files:read, files:write, providers:read, etc.
		field.Strings("scopes"),
		// Optional per-provider+folder restrictions. Empty = all providers.
		field.JSON("provider_scopes", []apitoken.ProviderScope{}).Optional(),
		field.Time("last_used_at").Optional().Nillable(),
		field.Time("expires_at").Optional().Nillable(),
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}

func (ApiToken) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("user", User.Type).Ref("api_tokens").Field("user_id").Unique().Required(),
	}
}

func (ApiToken) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("token_hash"),
		index.Fields("user_id"),
	}
}
