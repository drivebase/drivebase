package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// BandwidthDirection is upload or download.
type BandwidthDirection string

const (
	BandwidthDirectionUpload   BandwidthDirection = "upload"
	BandwidthDirectionDownload BandwidthDirection = "download"
)

// BandwidthLog is a time-series record flushed from Redis counters
// by the background bandwidth flush job.
type BandwidthLog struct {
	ent.Schema
}

func (BandwidthLog) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.UUID("user_id", uuid.UUID{}),
		field.UUID("provider_id", uuid.UUID{}),
		field.String("direction").NotEmpty(), // BandwidthDirection
		field.Int64("bytes").Default(0),
		field.Time("period_start"),
		field.Time("period_end"),
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}

func (BandwidthLog) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("user", User.Type).Ref("bandwidth_logs").Field("user_id").Unique().Required(),
	}
}

func (BandwidthLog) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("user_id", "period_start"),
		index.Fields("provider_id", "period_start"),
	}
}
