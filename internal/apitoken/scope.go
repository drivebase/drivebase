package apitoken

import "github.com/google/uuid"

// ProviderScope restricts a token to specific providers and optionally
// to specific folders within each provider.
// FolderIDs empty means all folders in that provider are accessible.
type ProviderScope struct {
	ProviderID uuid.UUID   `json:"provider_id"`
	FolderIDs  []uuid.UUID `json:"folder_ids,omitempty"`
}

// AllowsProvider reports whether the token's provider scopes permit access
// to the given provider. nil/empty scopes = unrestricted.
func AllowsProvider(scopes []ProviderScope, providerID uuid.UUID) bool {
	if len(scopes) == 0 {
		return true
	}
	for _, s := range scopes {
		if s.ProviderID == providerID {
			return true
		}
	}
	return false
}

// AllowsFolder reports whether the token's provider scopes permit access
// to the given folder within a provider. nil/empty scopes = unrestricted.
// If the provider is in the list but folderIDs is empty, all folders are allowed.
func AllowsFolder(scopes []ProviderScope, providerID, folderID uuid.UUID) bool {
	if len(scopes) == 0 {
		return true
	}
	for _, s := range scopes {
		if s.ProviderID != providerID {
			continue
		}
		if len(s.FolderIDs) == 0 {
			return true
		}
		for _, fid := range s.FolderIDs {
			if fid == folderID {
				return true
			}
		}
		return false
	}
	return false
}
