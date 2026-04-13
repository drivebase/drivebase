package resolver

import (
	"github.com/drivebase/drivebase/internal/ent"
	"github.com/drivebase/drivebase/internal/graph"
)

func mapUser(u *ent.User) *graph.User {
	return &graph.User{
		ID:        u.ID,
		Email:     u.Email,
		Name:      u.Name,
		CreatedAt: u.CreatedAt,
	}
}

func mapSession(s *ent.Session) *graph.Session {
	gs := &graph.Session{
		ID:        s.ID,
		CreatedAt: s.CreatedAt,
		ExpiresAt: s.ExpiresAt,
	}
	if s.IPAddress != "" {
		gs.IPAddress = &s.IPAddress
	}
	if s.UserAgent != "" {
		gs.UserAgent = &s.UserAgent
	}
	return gs
}

func mapWorkspace(w *ent.Workspace) *graph.Workspace {
	return &graph.Workspace{
		ID:        w.ID,
		Name:      w.Name,
		Slug:      w.Slug,
		CreatedAt: w.CreatedAt,
	}
}

func mapRole(r *ent.Role) *graph.Role {
	return &graph.Role{
		ID:       r.ID,
		Name:     r.Name,
		IsSystem: r.IsSystem,
	}
}

func mapProvider(p *ent.Provider) *graph.Provider {
	return &graph.Provider{
		ID:          p.ID,
		WorkspaceID: p.WorkspaceID,
		Name:        p.Name,
		Type:        graph.ProviderType(p.Type),
		AuthType:    graph.AuthType(p.AuthType),
		Status:      graph.ProviderStatus(p.Status),
		CreatedAt:   p.CreatedAt,
	}
}

func mapWorkspaceMember(m *ent.WorkspaceMember) *graph.WorkspaceMember {
	gm := &graph.WorkspaceMember{
		ID:       m.ID,
		JoinedAt: m.JoinedAt,
	}
	if u := m.Edges.User; u != nil {
		gm.User = mapUser(u)
	}
	if r := m.Edges.Role; r != nil {
		gm.Role = mapRole(r)
	}
	return gm
}
