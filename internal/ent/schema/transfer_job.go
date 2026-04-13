package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// TransferOperation is copy, move, or sync.
type TransferOperation string

const (
	TransferOperationCopy TransferOperation = "copy"
	TransferOperationMove TransferOperation = "move"
	TransferOperationSync TransferOperation = "sync"
)

// ConflictStrategy controls what happens when a destination file already exists.
type ConflictStrategy string

const (
	ConflictStrategySkip      ConflictStrategy = "skip"
	ConflictStrategyOverwrite ConflictStrategy = "overwrite"
)

// TransferJob is the parent record for a cross-provider file transfer.
type TransferJob struct {
	ent.Schema
}

func (TransferJob) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.UUID("workspace_id", uuid.UUID{}),
		field.UUID("source_provider_id", uuid.UUID{}),
		field.UUID("dest_provider_id", uuid.UUID{}),
		// source/dest folder remote IDs — empty string means root
		field.String("source_folder_remote_id").Optional().Default(""),
		field.String("dest_folder_remote_id").Optional().Default(""),
		field.String("operation").Default(string(TransferOperationCopy)), // copy | move | sync
		field.String("conflict_strategy").Default(string(ConflictStrategySkip)),
		field.String("status").Default(string(BatchStatusPending)),
		field.Int("total_files").Default(0),
		field.Int("completed_files").Default(0),
		field.Int("failed_files").Default(0),
		field.Int64("total_bytes").Default(0),
		field.Int64("transferred_bytes").Default(0),
		field.String("error_message").Optional(),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("completed_at").Optional().Nillable(),
	}
}

func (TransferJob) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("workspace", Workspace.Type).Ref("transfer_jobs").Field("workspace_id").Unique().Required(),
		edge.To("files", TransferJobFile.Type),
	}
}

func (TransferJob) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("workspace_id"),
	}
}
