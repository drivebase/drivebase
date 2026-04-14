package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

type Workspace struct {
	ent.Schema
}

func (Workspace) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.String("name").NotEmpty(),
		field.String("slug").Unique().NotEmpty(),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
	}
}

func (Workspace) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("members", WorkspaceMember.Type),
		edge.To("providers", Provider.Type),
		edge.To("roles", Role.Type),
		edge.To("upload_batches", UploadBatch.Type),
		edge.To("transfer_jobs", TransferJob.Type),
		edge.To("shared_links", SharedLink.Type),
		edge.To("bandwidth_logs", BandwidthLog.Type),
		edge.To("oauth_apps", OAuthApp.Type),
	}
}

func (Workspace) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("slug"),
	}
}
