package storage

import (
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	googledrive "google.golang.org/api/drive/v3"
)

// BuildOAuthConfig returns the oauth2.Config for the given provider type,
// or nil if the provider does not support OAuth.
func BuildOAuthConfig(provType ProviderType, clientID, clientSecret, callbackURL string) *oauth2.Config {
	switch provType {
	case ProviderTypeGoogleDrive:
		return &oauth2.Config{
			ClientID:     clientID,
			ClientSecret: clientSecret,
			RedirectURL:  callbackURL,
			Endpoint:     google.Endpoint,
			Scopes:       []string{googledrive.DriveScope},
		}
	default:
		return nil
	}
}
