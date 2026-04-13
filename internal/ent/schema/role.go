package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

type Role struct {
	ent.Schema
}

func (Role) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.UUID("workspace_id", uuid.UUID{}),
		field.String("name").NotEmpty(),
		// is_system marks built-in roles (owner, admin, member, viewer)
		// that cannot be deleted
		field.Bool("is_system").Default(false),
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}

func (Role) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("workspace", Workspace.Type).Ref("roles").Field("workspace_id").Unique().Required(),
		edge.To("permissions", Permission.Type),
		edge.To("members", WorkspaceMember.Type),
	}
}

func (Role) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("workspace_id", "name").Unique(),
	}
}
