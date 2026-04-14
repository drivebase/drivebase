package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// OAuthApp stores reusable OAuth client credentials (client_id + encrypted client_secret)
// for a specific provider type within a workspace.
// One record per (workspace_id, provider_type).
type OAuthApp struct {
	ent.Schema
}

func (OAuthApp) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.UUID("workspace_id", uuid.UUID{}),
		field.String("provider_type").NotEmpty(),
		field.String("client_id").NotEmpty(),
		field.Bytes("encrypted_client_secret").Sensitive(),
		field.String("alias").Optional(),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
	}
}

func (OAuthApp) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("workspace", Workspace.Type).Ref("oauth_apps").Field("workspace_id").Unique().Required(),
	}
}

func (OAuthApp) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("workspace_id", "provider_type").Unique(),
	}
}
