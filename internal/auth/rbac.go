package auth

import (
	"context"
	"fmt"

	"github.com/drivebase/drivebase/internal/ent"
	"github.com/drivebase/drivebase/internal/ent/workspacemember"
	entschema "github.com/drivebase/drivebase/internal/ent/schema"
	"github.com/google/uuid"
)

// ErrForbidden is returned when the user lacks permission for an action.
type ErrForbidden struct {
	Action       string
	ResourceType string
	ResourceID   string
}

func (e *ErrForbidden) Error() string {
	if e.ResourceID != "" {
		return fmt.Sprintf("forbidden: action %q on %s/%s", e.Action, e.ResourceType, e.ResourceID)
	}
	return fmt.Sprintf("forbidden: action %q on %s", e.Action, e.ResourceType)
}

// Check verifies that the user in ctx has the given action on a resource.
//
// resourceType: "workspace" | "provider" | "folder"
// resourceID:   specific resource UUID, or uuid.Nil to check workspace-level only
// action:       "read" | "write" | "delete" | "admin"
//
// Permission resolution (most specific wins):
//  1. Folder-level permission for the exact resourceID
//  2. Provider-level permission for the exact resourceID
//  3. Workspace-level permission (resource_id IS NULL)
func Check(ctx context.Context, db *ent.Client, resourceType string, resourceID uuid.UUID, action string) error {
	user, err := UserFromCtx(ctx)
	if err != nil {
		return err
	}

	workspaceID, ok := WorkspaceIDFromCtx(ctx)
	if !ok {
		return &ErrForbidden{Action: action, ResourceType: resourceType}
	}

	// Load the user's role in this workspace
	member, err := db.WorkspaceMember.Query().
		Where(
			workspacemember.UserID(user.ID),
			workspacemember.WorkspaceID(workspaceID),
		).
		WithRole(func(q *ent.RoleQuery) {
			q.WithPermissions()
		}).
		Only(ctx)
	if err != nil {
		return &ErrForbidden{Action: action, ResourceType: resourceType}
	}

	role := member.Edges.Role
	if role == nil {
		return &ErrForbidden{Action: action, ResourceType: resourceType}
	}

	// Check permissions from most specific to least specific
	perms := role.Edges.Permissions
	if hasPermission(perms, resourceType, &resourceID, action) {
		return nil
	}
	// Fall back to workspace-level (resource_id = nil)
	if hasPermission(perms, string(entschema.ResourceTypeWorkspace), nil, action) {
		return nil
	}

	return &ErrForbidden{
		Action:       action,
		ResourceType: resourceType,
		ResourceID:   resourceID.String(),
	}
}

// hasPermission scans a slice of permissions for a match.
// If resourceID is nil, matches only workspace-level (resource_id = nil) entries.
func hasPermission(perms []*ent.Permission, resourceType string, resourceID *uuid.UUID, action string) bool {
	for _, p := range perms {
		if p.ResourceType != resourceType {
			continue
		}
		// Check resource_id match
		if resourceID != nil && *resourceID != uuid.Nil {
			if p.ResourceID == nil || *p.ResourceID != *resourceID {
				continue
			}
		} else {
			// Only match workspace-level permissions (no resource_id)
			if p.ResourceID != nil {
				continue
			}
		}
		// Check action
		for _, a := range p.Actions {
			if a == action || a == string(entschema.ActionAdmin) {
				return true
			}
		}
	}
	return false
}

// IsWorkspaceOwner reports whether the user has the "owner" role in the workspace.
func IsWorkspaceOwner(ctx context.Context, db *ent.Client, workspaceID uuid.UUID) (bool, error) {
	user, err := UserFromCtx(ctx)
	if err != nil {
		return false, err
	}

	member, err := db.WorkspaceMember.Query().
		Where(
			workspacemember.UserID(user.ID),
			workspacemember.WorkspaceID(workspaceID),
		).
		WithRole().
		Only(ctx)
	if err != nil {
		return false, nil
	}

	return member.Edges.Role != nil && member.Edges.Role.Name == "owner", nil
}
