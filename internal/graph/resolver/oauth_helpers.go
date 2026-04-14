package resolver

import (
	"github.com/drivebase/drivebase/internal/storage"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	googledrive "google.golang.org/api/drive/v3"
)

func oauthConfigForType(provType storage.ProviderType, clientID, clientSecret, callbackURL string) *oauth2.Config {
	switch provType {
	case storage.ProviderTypeGoogleDrive:
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
