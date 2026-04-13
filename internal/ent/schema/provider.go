package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// ProviderType identifies which storage backend a provider uses.
type ProviderType string

const (
	ProviderTypeGoogleDrive ProviderType = "google_drive"
	ProviderTypeS3          ProviderType = "S3"
	ProviderTypeLocal       ProviderType = "local"
)

// ProviderStatus reflects the current connectivity state.
type ProviderStatus string

const (
	ProviderStatusActive       ProviderStatus = "active"
	ProviderStatusDisconnected ProviderStatus = "disconnected"
	ProviderStatusError        ProviderStatus = "error"
)

// AuthType describes how the provider authenticates.
type AuthType string

const (
	AuthTypeOAuth       AuthType = "oauth"
	AuthTypeAPIKey      AuthType = "api_key"
	AuthTypeCredential  AuthType = "credential" // username + password
	AuthTypeNone        AuthType = "none"
)

type Provider struct {
	ent.Schema
}

func (Provider) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.UUID("workspace_id", uuid.UUID{}),
		field.String("type").NotEmpty(),      // ProviderType
		field.String("name").NotEmpty(),      // Display name set by user
		field.String("auth_type").NotEmpty(), // AuthType
		field.String("status").Default(string(ProviderStatusActive)),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
	}
}

func (Provider) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("workspace", Workspace.Type).Ref("providers").Field("workspace_id").Unique().Required(),
		edge.To("credential", ProviderCredential.Type).Unique(),
		edge.To("cache_config", CacheConfig.Type).Unique(),
		edge.To("quota", ProviderQuota.Type).Unique(),
		edge.To("file_nodes", FileNode.Type),
	}
}

func (Provider) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("workspace_id"),
	}
}
