package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

type User struct {
	ent.Schema
}

func (User) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.String("email").Unique().NotEmpty(),
		field.String("name").NotEmpty(),
		field.String("password_hash").Sensitive(),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
	}
}

func (User) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("sessions", Session.Type),
		edge.To("api_tokens", ApiToken.Type),
		edge.To("providers", Provider.Type),
		edge.To("oauth_apps", OAuthApp.Type),
		edge.To("oauth_states", OAuthState.Type),
		edge.To("upload_batches", UploadBatch.Type),
		edge.To("transfer_jobs", TransferJob.Type),
		edge.To("shared_links", SharedLink.Type),
		edge.To("bandwidth_logs", BandwidthLog.Type),
	}
}

func (User) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("email"),
	}
}
