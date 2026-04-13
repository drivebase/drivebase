package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"
)

// ResourceType defines what a permission applies to.
type ResourceType string

const (
	ResourceTypeWorkspace ResourceType = "workspace"
	ResourceTypeProvider  ResourceType = "provider"
	ResourceTypeFolder    ResourceType = "folder"
)

// Action defines what operation is allowed.
type Action string

const (
	ActionRead   Action = "read"
	ActionWrite  Action = "write"
	ActionDelete Action = "delete"
	ActionAdmin  Action = "admin"
)

type Permission struct {
	ent.Schema
}

func (Permission) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.UUID("role_id", uuid.UUID{}),
		// resource_type: workspace | provider | folder
		field.String("resource_type").NotEmpty(),
		// resource_id: nil = applies to ALL resources of that type
		field.UUID("resource_id", uuid.UUID{}).Optional().Nillable(),
		// actions: JSON array of Action values e.g. ["read","write"]
		field.JSON("actions", []string{}),
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}

func (Permission) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("role", Role.Type).Ref("permissions").Field("role_id").Unique().Required(),
	}
}
