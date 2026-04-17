package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// OAuthState is a short-lived CSRF token that ties an OAuth callback back to
// the user + provider details that initiated the flow.
// Deleted after the callback is processed or on expiry.
type OAuthState struct {
	ent.Schema
}

func (OAuthState) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.UUID("user_id", uuid.UUID{}),
		field.UUID("oauth_app_id", uuid.UUID{}),
		field.String("provider_type").NotEmpty(),
		field.String("provider_name").NotEmpty(),
		field.Time("expires_at"),
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}

func (OAuthState) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("user", User.Type).Ref("oauth_states").Field("user_id").Unique().Required(),
	}
}

func (OAuthState) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("user_id"),
	}
}
