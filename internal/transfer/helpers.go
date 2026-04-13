package transfer

import (
	"context"
	"fmt"

	"github.com/drivebase/drivebase/internal/crypto"
	"github.com/drivebase/drivebase/internal/ent"
	entpc "github.com/drivebase/drivebase/internal/ent/providercredential"
	"github.com/drivebase/drivebase/internal/storage"
	"github.com/google/uuid"

	// Trigger provider init() registration
	_ "github.com/drivebase/drivebase/internal/storage/googledrive"
	_ "github.com/drivebase/drivebase/internal/storage/local"
	_ "github.com/drivebase/drivebase/internal/storage/s3"
)

func loadProvider(ctx context.Context, db *ent.Client, encKey string, providerID uuid.UUID) (storage.Provider, error) {
	p, err := db.Provider.Get(ctx, providerID)
	if err != nil {
		return nil, fmt.Errorf("provider not found")
	}
	cred, err := db.ProviderCredential.Query().
		Where(entpc.ProviderID(providerID)).
		Only(ctx)
	if err != nil {
		return nil, fmt.Errorf("credentials not found")
	}
	plain, err := crypto.Decrypt(cred.EncryptedData, encKey)
	if err != nil {
		return nil, fmt.Errorf("decrypt credentials: %w", err)
	}
	return storage.New(storage.ProviderType(p.Type), storage.Credentials(plain))
}
