package server

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

// loadStorageProvider decrypts credentials and returns a live Provider.
func loadStorageProvider(ctx context.Context, db *ent.Client, encKey string, providerID uuid.UUID) (storage.Provider, error) {
	p, err := db.Provider.Get(ctx, providerID)
	if err != nil {
		return nil, fmt.Errorf("provider not found")
	}

	cred, err := db.ProviderCredential.Query().
		Where(entpc.ProviderID(providerID)).
		Only(ctx)
	if err != nil {
		return nil, fmt.Errorf("provider credentials not found")
	}

	plaintext, err := crypto.Decrypt(cred.EncryptedData, encKey)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt credentials")
	}

	return storage.New(storage.ProviderType(p.Type), storage.Credentials(plaintext))
}
