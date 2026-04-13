package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// FileStatus tracks the state of an individual file in a batch.
type FileStatus string

const (
	FileStatusPending   FileStatus = "pending"
	FileStatusRunning   FileStatus = "running"
	FileStatusCompleted FileStatus = "completed"
	FileStatusFailed    FileStatus = "failed"
)

// UploadBatchFile tracks a single file within an UploadBatch.
type UploadBatchFile struct {
	ent.Schema
}

func (UploadBatchFile) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.UUID("batch_id", uuid.UUID{}),
		field.String("file_name").NotEmpty(),
		field.String("mime_type").Optional(),
		field.Int64("size").Default(0),
		field.Int64("transferred_bytes").Default(0),
		field.String("status").Default(string(FileStatusPending)),
		field.String("error_message").Optional(),
		// remote_id is set after the file is successfully uploaded
		field.String("remote_id").Optional(),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("completed_at").Optional().Nillable(),
	}
}

func (UploadBatchFile) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("batch", UploadBatch.Type).Ref("files").Field("batch_id").Unique().Required(),
	}
}

func (UploadBatchFile) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("batch_id"),
	}
}
