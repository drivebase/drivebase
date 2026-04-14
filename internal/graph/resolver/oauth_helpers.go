package resolver

import (
	"github.com/drivebase/drivebase/internal/storage"
	"golang.org/x/oauth2"
)

func oauthConfigForType(provType storage.ProviderType, clientID, clientSecret, callbackURL string) *oauth2.Config {
	return storage.BuildOAuthConfig(provType, clientID, clientSecret, callbackURL)
}
