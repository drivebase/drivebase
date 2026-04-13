package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// TransferJobFile tracks a single file within a TransferJob.
type TransferJobFile struct {
	ent.Schema
}

func (TransferJobFile) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.UUID("job_id", uuid.UUID{}),
		field.String("source_remote_id").NotEmpty(),
		field.String("dest_remote_id").Optional(),
		field.String("file_name").NotEmpty(),
		field.Int64("size").Default(0),
		field.Int64("transferred_bytes").Default(0),
		field.String("status").Default(string(FileStatusPending)),
		field.String("error_message").Optional(),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("completed_at").Optional().Nillable(),
	}
}

func (TransferJobFile) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("job", TransferJob.Type).Ref("files").Field("job_id").Unique().Required(),
	}
}

func (TransferJobFile) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("job_id"),
	}
}
