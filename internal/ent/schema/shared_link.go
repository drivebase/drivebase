package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// SharedLinkPermissions defines what anonymous users can do via the link.
type SharedLinkPermissions struct {
	Upload bool `json:"upload"`
	Delete bool `json:"delete"`
	Mkdir  bool `json:"mkdir"`
	Rename bool `json:"rename"`
	Move   bool `json:"move"`
	Copy   bool `json:"copy"`
}

// SharedLink allows public (or password-protected) access to a folder.
type SharedLink struct {
	ent.Schema
}

func (SharedLink) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.UUID("user_id", uuid.UUID{}),
		field.UUID("file_node_id", uuid.UUID{}),
		// token: 32-byte crypto/rand base64url — used in public URLs
		field.String("token").Unique().NotEmpty().Immutable(),
		// permissions: JSON object
		field.JSON("permissions", SharedLinkPermissions{}),
		// password_hash: optional bcrypt-hashed password for protected links
		field.String("password_hash").Optional().Sensitive(),
		// expires_at: nil means no expiry
		field.Time("expires_at").Optional().Nillable(),
		// max_uploads: nil means unlimited
		field.Int("max_uploads").Optional().Nillable(),
		field.Int("upload_count").Default(0),
		field.Bool("active").Default(true),
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}

func (SharedLink) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("user", User.Type).Ref("shared_links").Field("user_id").Unique().Required(),
	}
}

func (SharedLink) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("token"),
		index.Fields("user_id"),
	}
}
