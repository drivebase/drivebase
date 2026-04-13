package resolver

import (
	"context"
	"time"

	entfilenode "github.com/drivebase/drivebase/internal/ent/filenode"
	"github.com/drivebase/drivebase/internal/cache"
	"github.com/drivebase/drivebase/internal/graph"
	"github.com/drivebase/drivebase/internal/storage"
	"github.com/google/uuid"
)

// boolVal safely dereferences a *bool, returning false for nil.
func boolVal(b *bool) bool {
	if b == nil {
		return false
	}
	return *b
}

// upsertFileNodes syncs provider file list into DB (fire-and-forget).
func (r *Resolver) upsertFileNodes(ctx context.Context, providerID uuid.UUID, parentRemoteID string, parentNodeID *uuid.UUID, files []storage.FileInfo) {
	for _, fi := range files {
		q := r.DB.FileNode.Create().
			SetProviderID(providerID).
			SetRemoteID(fi.RemoteID).
			SetName(fi.Name).
			SetIsDir(fi.IsDir).
			SetSize(fi.Size).
			SetMimeType(fi.MimeType).
			SetChecksum(fi.Checksum)

		if parentNodeID != nil {
			q = q.SetParentID(*parentNodeID)
		}
		if !fi.ModifiedAt.IsZero() {
			q = q.SetRemoteModifiedAt(fi.ModifiedAt)
		}

		node, err := q.Save(ctx)
		if err != nil {
			// Already exists — update mutable fields
			_ = r.DB.FileNode.Update().
				Where(entfilenode.ProviderID(providerID), entfilenode.RemoteID(fi.RemoteID)).
				SetName(fi.Name).
				SetSize(fi.Size).
				SetMimeType(fi.MimeType).
				SetChecksum(fi.Checksum).
				Exec(ctx)
		} else {
			_ = node
		}
	}
}

func cachedListingToResult(listing *cache.CachedListing) *graph.ListFilesResult {
	files := make([]*graph.FileNode, len(listing.Files))
	for i, f := range listing.Files {
		files[i] = &graph.FileNode{
			RemoteID: f.RemoteID,
			Name:     f.Name,
			IsDir:    f.IsDir,
			Size:     int(f.Size),
			MimeType: strPtr(f.MimeType),
			Checksum: strPtr(f.Checksum),
		}
		if !f.ModifiedAt.IsZero() {
			t := f.ModifiedAt
			files[i].RemoteModifiedAt = &t
		}
	}
	result := &graph.ListFilesResult{Files: files}
	if listing.NextPageToken != "" {
		result.NextPageToken = &listing.NextPageToken
	}
	return result
}

func filesToCachedListing(result *storage.ListResult) *cache.CachedListing {
	files := make([]cache.CachedFile, len(result.Files))
	for i, f := range result.Files {
		files[i] = cache.CachedFile{
			RemoteID:   f.RemoteID,
			Name:       f.Name,
			IsDir:      f.IsDir,
			Size:       f.Size,
			MimeType:   f.MimeType,
			Checksum:   f.Checksum,
			ModifiedAt: f.ModifiedAt,
			ParentID:   f.ParentID,
		}
	}
	return &cache.CachedListing{
		Files:         files,
		NextPageToken: result.NextPageToken,
	}
}

func fileResultToGraphQL(result *storage.ListResult) *graph.ListFilesResult {
	files := make([]*graph.FileNode, len(result.Files))
	for i, f := range result.Files {
		gf := &graph.FileNode{
			RemoteID: f.RemoteID,
			Name:     f.Name,
			IsDir:    f.IsDir,
			Size:     int(f.Size),
			MimeType: strPtr(f.MimeType),
			Checksum: strPtr(f.Checksum),
		}
		if !f.ModifiedAt.IsZero() {
			t := f.ModifiedAt
			gf.RemoteModifiedAt = &t
		}
		files[i] = gf
	}
	out := &graph.ListFilesResult{Files: files}
	if result.NextPageToken != "" {
		out.NextPageToken = &result.NextPageToken
	}
	return out
}

func strPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func timePtr(t time.Time) *time.Time {
	if t.IsZero() {
		return nil
	}
	return &t
}
