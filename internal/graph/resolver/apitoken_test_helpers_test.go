package resolver

import (
	"time"

	"github.com/drivebase/drivebase/internal/apitoken"
	"github.com/drivebase/drivebase/internal/ent"
	"github.com/google/uuid"
)

func makeEntAPIToken() *ent.ApiToken {
	return &ent.ApiToken{
		ID:           uuid.New(),
		Name:         "Test Token",
		DisplayToken: "drv_abc12345...wx9z",
		Scopes:       []string{apitoken.ScopeFilesRead},
		CreatedAt:    time.Now(),
	}
}
