package e2e

import (
	"fmt"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestE2E_Auth covers sign-up, sign-in, token refresh, and sign-out.
func TestE2E_Auth(t *testing.T) {
	s := setupSuite(t)

	auth := s.signUp(t, "auth@test.com", "Auth User", "password123")
	assert.NotEmpty(t, auth.AccessToken)
	assert.NotEmpty(t, auth.RefreshToken)
	assert.Equal(t, "auth@test.com", auth.User.Email)

	// Sign-in returns a fresh token
	auth2 := s.signIn(t, "auth@test.com", "password123", nil)
	assert.NotEmpty(t, auth2.AccessToken)

	// Wrong password is rejected
	resp := s.gqlRaw(t, `mutation {
		signIn(input: { email: "auth@test.com", password: "wrong" }) { accessToken }
	}`, nil, "")
	assert.NotEmpty(t, resp.Errors, "expected GraphQL error for bad password")

	// Refresh token
	var refreshData struct {
		RefreshToken authPayload `json:"refreshToken"`
	}
	s.gql(t, `mutation Refresh($token: String!) {
		refreshToken(token: $token) { accessToken refreshToken user { id } }
	}`, map[string]any{"token": auth.RefreshToken}, "", &refreshData)
	assert.NotEmpty(t, refreshData.RefreshToken.AccessToken)

	// Sign-out
	var signOutData struct {
		SignOut bool `json:"signOut"`
	}
	s.gql(t, `mutation { signOut }`, nil, auth.AccessToken, &signOutData)
	assert.True(t, signOutData.SignOut)
}

// TestE2E_WorkspaceAndProvider covers workspace creation and S3 provider connection.
func TestE2E_WorkspaceAndProvider(t *testing.T) {
	s := setupSuite(t)

	auth := s.signUp(t, "ws@test.com", "WS User", "password123")
	ws := s.createWorkspace(t, auth.AccessToken, "My Workspace", "my-workspace")
	assert.NotEmpty(t, ws.ID)
	assert.Equal(t, "my-workspace", ws.Slug)

	// Re-authenticate scoped to workspace
	scoped := s.signIn(t, "ws@test.com", "password123", strPtr("my-workspace"))
	assert.NotEmpty(t, scoped.AccessToken)

	// Connect S3 (MinIO) provider
	prov := s.connectProvider(t, scoped.AccessToken, ws.ID, "Test MinIO", "S3", s.s3CredsJSON())
	assert.NotEmpty(t, prov.ID)
	assert.Equal(t, "S3", prov.Type)

	// List providers
	var listData struct {
		Providers []provider `json:"providers"`
	}
	s.gql(t, `query Providers($wid: UUID!) {
		providers(workspaceId: $wid) { id name type }
	}`, map[string]any{"wid": ws.ID}, scoped.AccessToken, &listData)
	require.Len(t, listData.Providers, 1)
	assert.Equal(t, prov.ID, listData.Providers[0].ID)
}

// TestE2E_UploadAndDownload covers the full upload → list → download flow.
func TestE2E_UploadAndDownload(t *testing.T) {
	s := setupSuite(t)

	auth := s.signUp(t, "upload@test.com", "Upload User", "password123")
	ws := s.createWorkspace(t, auth.AccessToken, "Upload WS", "upload-ws")
	scoped := s.signIn(t, "upload@test.com", "password123", strPtr("upload-ws"))
	prov := s.connectProvider(t, scoped.AccessToken, ws.ID, "MinIO", "S3", s.s3CredsJSON())

	content := []byte("hello drivebase e2e!")
	s.restUpload(t, scoped.AccessToken, prov.ID, "hello.txt", content)

	// File should appear in listing
	var found *fileNode
	require.Eventually(t, func() bool {
		files := s.listFiles(t, scoped.AccessToken, prov.ID)
		for _, f := range files {
			if f.Name == "hello.txt" {
				found = &f
				return true
			}
		}
		return false
	}, 10*time.Second, 500*time.Millisecond, "hello.txt never appeared in listing")

	require.NotNil(t, found)
	assert.Equal(t, len(content), found.Size)

	// Download via REST
	resp := s.restGET(t, fmt.Sprintf("/api/v1/download/%s", found.ID), scoped.AccessToken, "")
	defer resp.Body.Close()
	body := readBody(t, resp)
	require.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Equal(t, content, body)
}

// TestE2E_SharedLink covers creating a share link and downloading via token.
func TestE2E_SharedLink(t *testing.T) {
	s := setupSuite(t)

	auth := s.signUp(t, "share@test.com", "Share User", "password123")
	ws := s.createWorkspace(t, auth.AccessToken, "Share WS", "share-ws")
	scoped := s.signIn(t, "share@test.com", "password123", strPtr("share-ws"))
	prov := s.connectProvider(t, scoped.AccessToken, ws.ID, "MinIO", "S3", s.s3CredsJSON())

	content := []byte("shared file content")
	s.restUpload(t, scoped.AccessToken, prov.ID, "shared.txt", content)

	// Wait for file to appear in DB
	var fileID string
	require.Eventually(t, func() bool {
		files := s.listFiles(t, scoped.AccessToken, prov.ID)
		for _, f := range files {
			if f.Name == "shared.txt" {
				fileID = f.ID
				return true
			}
		}
		return false
	}, 10*time.Second, 500*time.Millisecond, "shared.txt never appeared")

	// Create a shared link
	link := s.createSharedLink(t, scoped.AccessToken, ws.ID, fileID)
	assert.NotEmpty(t, link.Token)
	assert.True(t, link.Active)

	// Download via share token — no JWT
	resp := s.restGET(t, fmt.Sprintf("/api/v1/download/%s", fileID), "", link.Token)
	defer resp.Body.Close()
	body := readBody(t, resp)
	require.Equal(t, http.StatusOK, resp.StatusCode, "share token download failed")
	assert.Equal(t, content, body)

	// Without a valid token, download is rejected
	resp2 := s.restGET(t, fmt.Sprintf("/api/v1/download/%s", fileID), "", "")
	readBody(t, resp2)
	assert.Equal(t, http.StatusUnauthorized, resp2.StatusCode)

	// Revoke the link
	var revokeData struct {
		RevokeSharedLink bool `json:"revokeSharedLink"`
	}
	s.gql(t, `mutation Revoke($id: UUID!) { revokeSharedLink(id: $id) }`,
		map[string]any{"id": link.ID}, scoped.AccessToken, &revokeData)
	assert.True(t, revokeData.RevokeSharedLink)

	// Revoked link is rejected
	resp3 := s.restGET(t, fmt.Sprintf("/api/v1/download/%s", fileID), "", link.Token)
	readBody(t, resp3)
	assert.Equal(t, http.StatusUnauthorized, resp3.StatusCode)
}

// TestE2E_TempLink covers generating and using an HMAC-signed temp link.
func TestE2E_TempLink(t *testing.T) {
	s := setupSuite(t)

	auth := s.signUp(t, "temp@test.com", "Temp User", "password123")
	ws := s.createWorkspace(t, auth.AccessToken, "Temp WS", "temp-ws")
	scoped := s.signIn(t, "temp@test.com", "password123", strPtr("temp-ws"))
	prov := s.connectProvider(t, scoped.AccessToken, ws.ID, "MinIO", "S3", s.s3CredsJSON())

	content := []byte("temp link content")
	s.restUpload(t, scoped.AccessToken, prov.ID, "temp.txt", content)

	var fileID string
	require.Eventually(t, func() bool {
		files := s.listFiles(t, scoped.AccessToken, prov.ID)
		for _, f := range files {
			if f.Name == "temp.txt" {
				fileID = f.ID
				return true
			}
		}
		return false
	}, 10*time.Second, 500*time.Millisecond, "temp.txt never appeared")

	// Generate temp link
	var tlData struct {
		GenerateTempLink string `json:"generateTempLink"`
	}
	s.gql(t, `mutation GenTempLink($id: UUID!, $ttl: Int) {
		generateTempLink(fileNodeID: $id, ttlSeconds: $ttl)
	}`, map[string]any{"id": fileID, "ttl": 60}, scoped.AccessToken, &tlData)
	qs := tlData.GenerateTempLink
	assert.True(t, strings.Contains(qs, "exp=") && strings.Contains(qs, "sig="),
		"unexpected temp link format: %s", qs)

	// Download via temp link — no JWT
	url := fmt.Sprintf("/api/v1/templink/%s?%s", fileID, qs)
	resp := s.restGET(t, url, "", "")
	defer resp.Body.Close()
	body := readBody(t, resp)
	require.Equal(t, http.StatusOK, resp.StatusCode, "temp link download failed")
	assert.Equal(t, content, body)

	// Tampered signature is rejected
	badURL := fmt.Sprintf("/api/v1/templink/%s?exp=9999999999&sig=badsig", fileID)
	resp2 := s.restGET(t, badURL, "", "")
	readBody(t, resp2)
	assert.Equal(t, http.StatusGone, resp2.StatusCode)
}

// TestE2E_FolderSync covers cross-provider folder sync.
func TestE2E_FolderSync(t *testing.T) {
	s := setupSuite(t)

	auth := s.signUp(t, "sync@test.com", "Sync User", "password123")
	ws := s.createWorkspace(t, auth.AccessToken, "Sync WS", "sync-ws")
	scoped := s.signIn(t, "sync@test.com", "password123", strPtr("sync-ws"))

	// Use two separate buckets as source and destination
	srcCreds := s.s3CredsJSON()

	// For destination, reuse same MinIO but different bucket name in creds
	// (the transfer engine streams files; same bucket works in a real test
	// since file names don't collide in this test)
	dstCreds := srcCreds // same bucket — sync copies files into same namespace

	src := s.connectProvider(t, scoped.AccessToken, ws.ID, "Source", "S3", srcCreds)
	dst := s.connectProvider(t, scoped.AccessToken, ws.ID, "Dest", "S3", dstCreds)

	// Upload a file to source
	s.restUpload(t, scoped.AccessToken, src.ID, "syncme.txt", []byte("sync content"))

	// Wait for file in DB
	require.Eventually(t, func() bool {
		files := s.listFiles(t, scoped.AccessToken, src.ID)
		for _, f := range files {
			if f.Name == "syncme.txt" {
				return true
			}
		}
		return false
	}, 10*time.Second, 500*time.Millisecond, "syncme.txt never appeared in source")

	// Start sync
	var syncData struct {
		StartFolderSync struct {
			ID     string `json:"id"`
			Status string `json:"status"`
		} `json:"startFolderSync"`
	}
	s.gql(t, `mutation StartSync($input: StartFolderSyncInput!) {
		startFolderSync(input: $input) { id status }
	}`, map[string]any{
		"input": map[string]any{
			"workspaceID":      ws.ID,
			"sourceProviderID": src.ID,
			"destProviderID":   dst.ID,
			"conflictStrategy": "SKIP",
		},
	}, scoped.AccessToken, &syncData)

	jobID := syncData.StartFolderSync.ID
	assert.NotEmpty(t, jobID)

	// Poll until job completes
	require.Eventually(t, func() bool {
		var jobData struct {
			TransferJob struct {
				Status string `json:"status"`
			} `json:"transferJob"`
		}
		s.gql(t, `query Job($id: UUID!) { transferJob(id: $id) { status } }`,
			map[string]any{"id": jobID}, scoped.AccessToken, &jobData)
		status := jobData.TransferJob.Status
		return status == "completed" || status == "failed"
	}, 30*time.Second, time.Second, "sync job never completed")

	// Verify final status
	var finalData struct {
		TransferJob struct {
			Status         string `json:"status"`
			CompletedFiles int    `json:"completedFiles"`
		} `json:"transferJob"`
	}
	s.gql(t, `query Job($id: UUID!) {
		transferJob(id: $id) { status completedFiles }
	}`, map[string]any{"id": jobID}, scoped.AccessToken, &finalData)
	assert.Equal(t, "completed", finalData.TransferJob.Status)
	assert.GreaterOrEqual(t, finalData.TransferJob.CompletedFiles, 1)
}
