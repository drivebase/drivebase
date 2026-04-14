package e2e

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"testing"

	"github.com/stretchr/testify/require"
)

// gql sends a GraphQL request and unmarshals the response data into out.
func (s *suite) gql(t *testing.T, query string, variables map[string]any, token string, out any) {
	t.Helper()

	body, err := json.Marshal(map[string]any{
		"query":     query,
		"variables": variables,
	})
	require.NoError(t, err)

	req, err := http.NewRequest(http.MethodPost, s.srv.URL+"/graphql", bytes.NewReader(body))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	require.NoError(t, err)

	var gqlResp struct {
		Data   json.RawMessage `json:"data"`
		Errors []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}
	require.NoError(t, json.Unmarshal(raw, &gqlResp), "unmarshal response: %s", raw)
	require.Empty(t, gqlResp.Errors, "GraphQL errors in response: %s", raw)

	if out != nil {
		require.NoError(t, json.Unmarshal(gqlResp.Data, out))
	}
}

// gqlRaw sends a GraphQL request and returns the raw parsed response (errors included).
func (s *suite) gqlRaw(t *testing.T, query string, variables map[string]any, token string) struct {
	Data   json.RawMessage `json:"data"`
	Errors []struct {
		Message string `json:"message"`
	} `json:"errors"`
} {
	t.Helper()
	body, err := json.Marshal(map[string]any{"query": query, "variables": variables})
	require.NoError(t, err)
	req, err := http.NewRequest(http.MethodPost, s.srv.URL+"/graphql", bytes.NewReader(body))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()
	raw, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	var out struct {
		Data   json.RawMessage `json:"data"`
		Errors []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}
	require.NoError(t, json.Unmarshal(raw, &out))
	return out
}

// restGET performs a GET request against the test server.
func (s *suite) restGET(t *testing.T, path, token, shareToken string) *http.Response {
	t.Helper()
	req, err := http.NewRequest(http.MethodGet, s.srv.URL+path, nil)
	require.NoError(t, err)
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	if shareToken != "" {
		req.Header.Set("X-Share-Token", shareToken)
	}
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	return resp
}

// restUpload POSTs a multipart file upload and asserts HTTP 200.
func (s *suite) restUpload(t *testing.T, token, providerID, filename string, content []byte) {
	t.Helper()

	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	require.NoError(t, mw.WriteField("provider_id", providerID))
	fw, err := mw.CreateFormFile("file", filename)
	require.NoError(t, err)
	_, err = fw.Write(content)
	require.NoError(t, err)
	require.NoError(t, mw.Close())

	req, err := http.NewRequest(http.MethodPost, s.srv.URL+"/api/v1/upload", &buf)
	require.NoError(t, err)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	body := readBody(t, resp)
	require.Equal(t, http.StatusOK, resp.StatusCode, "upload failed: %s", body)
}

// ── Typed GraphQL helpers ────────────────────────────────────────────────────

type authPayload struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	User         struct {
		ID    string `json:"id"`
		Email string `json:"email"`
	} `json:"user"`
}

func (s *suite) signUp(t *testing.T, email, name, password string) authPayload {
	t.Helper()
	var data struct {
		SignUp authPayload `json:"signUp"`
	}
	s.gql(t, `mutation SignUp($input: SignUpInput!) {
		signUp(input: $input) {
			accessToken refreshToken user { id email }
		}
	}`, map[string]any{
		"input": map[string]any{"email": email, "name": name, "password": password},
	}, "", &data)
	return data.SignUp
}

func (s *suite) signIn(t *testing.T, email, password string, workspaceSlug *string) authPayload {
	t.Helper()
	var data struct {
		SignIn authPayload `json:"signIn"`
	}
	input := map[string]any{"email": email, "password": password}
	if workspaceSlug != nil {
		input["workspaceSlug"] = *workspaceSlug
	}
	s.gql(t, `mutation SignIn($input: SignInInput!) {
		signIn(input: $input) {
			accessToken refreshToken user { id email }
		}
	}`, map[string]any{"input": input}, "", &data)
	return data.SignIn
}

type workspace struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Slug string `json:"slug"`
}

func (s *suite) createWorkspace(t *testing.T, token, name, slug string) workspace {
	t.Helper()
	var data struct {
		CreateWorkspace workspace `json:"createWorkspace"`
	}
	s.gql(t, `mutation CreateWorkspace($input: CreateWorkspaceInput!) {
		createWorkspace(input: $input) { id name slug }
	}`, map[string]any{
		"input": map[string]any{"name": name, "slug": slug},
	}, token, &data)
	return data.CreateWorkspace
}

type provider struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Type string `json:"type"`
}

func (s *suite) connectProvider(t *testing.T, token, name, provType, credsJSON string) provider {
	t.Helper()
	var data struct {
		ConnectProvider provider `json:"connectProvider"`
	}
	s.gql(t, `mutation ConnectProvider($input: ConnectProviderInput!) {
		connectProvider(input: $input) { id name type }
	}`, map[string]any{
		"input": map[string]any{
			"name":        name,
			"type":        provType,
			"credentials": credsJSON,
		},
	}, token, &data)
	return data.ConnectProvider
}

type fileNode struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	IsDir    bool   `json:"isDir"`
	RemoteID string `json:"remoteID"`
	Size     int    `json:"size"`
}

func (s *suite) listFiles(t *testing.T, token, providerID string) []fileNode {
	t.Helper()
	var data struct {
		ListFiles struct {
			Files []fileNode `json:"files"`
		} `json:"listFiles"`
	}
	s.gql(t, `query ListFiles($input: ListFilesInput!) {
		listFiles(input: $input) { files { id name isDir remoteID size } }
	}`, map[string]any{
		"input": map[string]any{"providerID": providerID},
	}, token, &data)
	return data.ListFiles.Files
}

type sharedLink struct {
	ID         string `json:"id"`
	Token      string `json:"token"`
	FileNodeID string `json:"fileNodeID"`
	Active     bool   `json:"active"`
}

func (s *suite) createSharedLink(t *testing.T, token, fileNodeID string) sharedLink {
	t.Helper()
	var data struct {
		CreateSharedLink sharedLink `json:"createSharedLink"`
	}
	s.gql(t, `mutation CreateSharedLink($input: CreateSharedLinkInput!) {
		createSharedLink(input: $input) { id token fileNodeID active }
	}`, map[string]any{
		"input": map[string]any{
			"fileNodeID": fileNodeID,
		},
	}, token, &data)
	return data.CreateSharedLink
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────

// readBody reads and returns the full response body, closing it.
func readBody(t *testing.T, resp *http.Response) []byte {
	t.Helper()
	b, err := io.ReadAll(resp.Body)
	resp.Body.Close()
	require.NoError(t, err)
	return b
}

// requireStatus asserts resp has the expected HTTP status code.
func requireStatus(t *testing.T, resp *http.Response, status int, msg string) {
	t.Helper()
	body := readBody(t, resp)
	require.Equal(t, status, resp.StatusCode, "%s — body: %s", msg, body)
}

// strPtr returns a pointer to s.
func strPtr(s string) *string { return &s }

// fmtErr returns a formatted error — avoids direct fmt import in test files.
func fmtErr(format string, args ...any) error { return fmt.Errorf(format, args...) }
