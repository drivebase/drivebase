package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// FileNode represents a file or folder in any storage provider.
// It mirrors the remote provider's tree, cached locally for fast browsing.
type FileNode struct {
	ent.Schema
}

func (FileNode) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.UUID("provider_id", uuid.UUID{}),
		// parent_id is nil for root-level nodes
		field.UUID("parent_id", uuid.UUID{}).Optional().Nillable(),
		// remote_id is the provider-specific identifier (e.g. Google Drive file ID)
		field.String("remote_id").NotEmpty(),
		field.String("name").NotEmpty(),
		field.Bool("is_dir").Default(false),
		field.Int64("size").Default(0),
		field.String("mime_type").Optional(),
		field.String("checksum").Optional(),
		field.Time("remote_modified_at").Optional().Nillable(),
		field.Time("synced_at").Default(time.Now),
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}

func (FileNode) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("provider", Provider.Type).Ref("file_nodes").Field("provider_id").Unique().Required().Annotations(entsql.OnDelete(entsql.Cascade)),
		// Self-referential parent-child tree
		edge.To("children", FileNode.Type).From("parent").Field("parent_id").Unique(),
	}
}

func (FileNode) Indexes() []ent.Index {
	return []ent.Index{
		// Fast lookup by provider + remote ID (upsert on sync)
		index.Fields("provider_id", "remote_id").Unique(),
		// Fast listing of children
		index.Fields("provider_id", "parent_id"),
	}
}
