package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/dialect/entsql"
	"github.com/google/uuid"
)

// ProviderCredential stores an AES-256-GCM encrypted JSON blob
// containing all provider-specific credentials.
// The schema varies by provider type:
//   - google_drive: {client_id, client_secret, access_token, refresh_token, expiry}
//   - s3:           {endpoint, region, bucket, access_key, secret_key}
//   - local:        {base_path}
type ProviderCredential struct {
	ent.Schema
}

func (ProviderCredential) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.UUID("provider_id", uuid.UUID{}),
		// encrypted_data: nonce (12 bytes) prepended to ciphertext
		field.Bytes("encrypted_data").Sensitive(),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
	}
}

func (ProviderCredential) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("provider", Provider.Type).Ref("credential").Field("provider_id").Unique().Required().Annotations(entsql.OnDelete(entsql.Cascade)),
	}
}
