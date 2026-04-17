package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// BatchStatus tracks the overall state of a batch operation.
type BatchStatus string

const (
	BatchStatusPending   BatchStatus = "pending"
	BatchStatusRunning   BatchStatus = "running"
	BatchStatusCompleted BatchStatus = "completed"
	BatchStatusFailed    BatchStatus = "failed"
	BatchStatusCancelled BatchStatus = "cancelled"
)

// UploadBatch is the parent record for a multi-file upload.
// Individual files are tracked in UploadBatchFile.
// River jobs process each file and atomically update this record.
type UploadBatch struct {
	ent.Schema
}

func (UploadBatch) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.UUID("user_id", uuid.UUID{}),
		field.UUID("provider_id", uuid.UUID{}),
		// parent_remote_id: the destination folder remote ID in the provider
		field.String("parent_remote_id").Optional(),
		field.String("status").Default(string(BatchStatusPending)),
		field.Int("total_files").Default(0),
		field.Int("completed_files").Default(0),
		field.Int("failed_files").Default(0),
		field.Int64("total_bytes").Default(0),
		field.Int64("transferred_bytes").Default(0),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("completed_at").Optional().Nillable(),
	}
}

func (UploadBatch) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("user", User.Type).Ref("upload_batches").Field("user_id").Unique().Required(),
		edge.To("files", UploadBatchFile.Type),
	}
}

func (UploadBatch) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("user_id"),
	}
}
