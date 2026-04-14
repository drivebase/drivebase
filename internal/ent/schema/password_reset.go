package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

type PasswordReset struct {
	ent.Schema
}

func (PasswordReset) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.String("email").NotEmpty(),
		field.String("otp").Sensitive().NotEmpty(),
		field.Time("expires_at"),
		field.Time("used_at").Optional().Nillable(),
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}

func (PasswordReset) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("email"),
	}
}
