package resolver

import (
	"encoding/json"

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
	gp := &graph.Provider{
		ID:          p.ID,
		WorkspaceID: p.WorkspaceID,
		Name:        p.Name,
		Type:        graph.ProviderType(p.Type),
		AuthType:    graph.AuthType(p.AuthType),
		Status:      graph.ProviderStatus(p.Status),
		CreatedAt:   p.CreatedAt,
	}
	if q := p.Edges.Quota; q != nil {
		gp.Quota = mapProviderQuota(q)
	}
	return gp
}

func mapProviderQuota(q *ent.ProviderQuota) *graph.ProviderQuota {
	gq := &graph.ProviderQuota{
		ProviderID: q.ProviderID,
		TotalBytes: int(q.TotalBytes),
		UsedBytes:  int(q.UsedBytes),
		FreeBytes:  int(q.FreeBytes),
		TrashBytes: int(q.TrashBytes),
		SyncedAt:   q.SyncedAt,
	}
	if q.PlanName != "" {
		gq.PlanName = &q.PlanName
	}
	if q.Extra != nil {
		if b, err := json.Marshal(q.Extra); err == nil {
			s := string(b)
			gq.Extra = &s
		}
	}
	return gq
}

func mapTransferJob(j *ent.TransferJob) *graph.TransferJob {
	gj := &graph.TransferJob{
		ID:                   j.ID,
		WorkspaceID:          j.WorkspaceID,
		SourceProviderID:     j.SourceProviderID,
		DestProviderID:       j.DestProviderID,
		SourceFolderRemoteID: j.SourceFolderRemoteID,
		DestFolderRemoteID:   j.DestFolderRemoteID,
		Operation:            j.Operation,
		ConflictStrategy:     j.ConflictStrategy,
		Status:               j.Status,
		TotalFiles:           j.TotalFiles,
		CompletedFiles:       j.CompletedFiles,
		FailedFiles:          j.FailedFiles,
		TotalBytes:           int(j.TotalBytes),
		TransferredBytes:     int(j.TransferredBytes),
		CreatedAt:            j.CreatedAt,
	}
	if j.ErrorMessage != "" {
		gj.ErrorMessage = &j.ErrorMessage
	}
	gj.CompletedAt = j.CompletedAt
	return gj
}

func mapFileNode(f *ent.FileNode) *graph.FileNode {
	gf := &graph.FileNode{
		ID:         f.ID,
		ProviderID: f.ProviderID,
		RemoteID:   f.RemoteID,
		Name:       f.Name,
		IsDir:      f.IsDir,
		Size:       int(f.Size),
		SyncedAt:   f.SyncedAt,
		CreatedAt:  f.CreatedAt,
	}
	if f.ParentID != nil {
		gf.ParentID = f.ParentID
	}
	if f.MimeType != "" {
		gf.MimeType = &f.MimeType
	}
	if f.Checksum != "" {
		gf.Checksum = &f.Checksum
	}
	gf.RemoteModifiedAt = f.RemoteModifiedAt
	return gf
}

func mapUploadBatch(b *ent.UploadBatch) *graph.UploadBatch {
	gb := &graph.UploadBatch{
		ID:               b.ID,
		WorkspaceID:      b.WorkspaceID,
		ProviderID:       b.ProviderID,
		Status:           b.Status,
		TotalFiles:       b.TotalFiles,
		CompletedFiles:   b.CompletedFiles,
		FailedFiles:      b.FailedFiles,
		TotalBytes:       int(b.TotalBytes),
		TransferredBytes: int(b.TransferredBytes),
		CreatedAt:        b.CreatedAt,
	}
	if b.ParentRemoteID != "" {
		gb.ParentRemoteID = &b.ParentRemoteID
	}
	gb.CompletedAt = b.CompletedAt
	return gb
}

func mapSharedLink(l *ent.SharedLink) *graph.SharedLink {
	gl := &graph.SharedLink{
		ID:          l.ID,
		WorkspaceID: l.WorkspaceID,
		FileNodeID:  l.FileNodeID,
		Token:       l.Token,
		Permissions: &graph.SharedLinkPermissions{
			Upload: l.Permissions.Upload,
			Delete: l.Permissions.Delete,
			Mkdir:  l.Permissions.Mkdir,
			Rename: l.Permissions.Rename,
			Move:   l.Permissions.Move,
			Copy:   l.Permissions.Copy,
		},
		UploadCount: l.UploadCount,
		Active:      l.Active,
		CreatedAt:   l.CreatedAt,
	}
	if l.ExpiresAt != nil {
		gl.ExpiresAt = l.ExpiresAt
	}
	if l.MaxUploads != nil {
		gl.MaxUploads = l.MaxUploads
	}
	return gl
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
