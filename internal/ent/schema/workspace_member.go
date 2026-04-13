package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

type WorkspaceMember struct {
	ent.Schema
}

func (WorkspaceMember) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.UUID("user_id", uuid.UUID{}),
		field.UUID("workspace_id", uuid.UUID{}),
		field.UUID("role_id", uuid.UUID{}),
		field.Time("joined_at").Default(time.Now).Immutable(),
	}
}

func (WorkspaceMember) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("user", User.Type).Ref("memberships").Field("user_id").Unique().Required(),
		edge.From("workspace", Workspace.Type).Ref("members").Field("workspace_id").Unique().Required(),
		edge.From("role", Role.Type).Ref("members").Field("role_id").Unique().Required(),
	}
}

func (WorkspaceMember) Indexes() []ent.Index {
	return []ent.Index{
		// A user can only be a member of a workspace once
		index.Fields("user_id", "workspace_id").Unique(),
	}
}
