package handler

import (
	"VCCwebsite/internal/auth"
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"testing"
)

const testAppURL = "https://app.example.com"

type adminEnv struct {
	mux            *http.ServeMux
	mailer         *fakeMailer
	am             *auth.AuthMiddleware
	adminToken     string
	nonAdminTokens map[string]string // role -> token
}

func newAdminEnv(t *testing.T) *adminEnv {
	t.Helper()
	setupAuthDB(t) // seeds admin@example.com
	am, err := auth.NewAuthMiddleware("test-secret")
	if err != nil {
		t.Fatal(err)
	}
	env := &adminEnv{mux: http.NewServeMux(), mailer: &fakeMailer{}}
	RegisterAdminRoutes(env.mux, am, env.mailer, testAppURL)

	var adminID int64
	auth.DB.QueryRow(`SELECT id FROM users WHERE email = 'admin@example.com'`).Scan(&adminID)
	env.am = am
	env.adminToken, _ = am.IssueToken(adminID, "admin")
	env.nonAdminTokens = map[string]string{}
	for _, role := range []string{"requester", "script viewer", "script editor"} {
		id := insertActiveUser(t, strings.ReplaceAll(role, " ", ".")+"@example.com", role, "pw")
		env.nonAdminTokens[role], _ = am.IssueToken(id, role)
	}
	return env
}

func insertActiveUser(t *testing.T, email, role, password string) int64 {
	t.Helper()
	hash, err := auth.HashPassword(password)
	if err != nil {
		t.Fatal(err)
	}
	res, err := auth.DB.Exec(`INSERT INTO users (name, email, password_hash, role, status) VALUES ('User', ?, ?, ?, 'active')`,
		email, hash, role)
	if err != nil {
		t.Fatal(err)
	}
	id, _ := res.LastInsertId()
	return id
}

// emailedToken pulls the raw setup token out of the link in a sent email.
func emailedToken(t *testing.T, body string) string {
	t.Helper()
	prefix := testAppURL + "/set-password?token="
	start := strings.Index(body, prefix)
	if start < 0 {
		t.Fatalf("no setup link in email: %q", body)
	}
	link, err := url.Parse(strings.Fields(body[start:])[0])
	if err != nil {
		t.Fatal(err)
	}
	return link.Query().Get("token")
}

// captureLog collects everything written through the standard logger during the test.
func captureLog(t *testing.T) *bytes.Buffer {
	t.Helper()
	var buf bytes.Buffer
	log.SetOutput(&buf)
	t.Cleanup(func() { log.SetOutput(os.Stderr) })
	return &buf
}

func (e *adminEnv) do(method, path, token, body string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	rec := httptest.NewRecorder()
	e.mux.ServeHTTP(rec, req)
	return rec
}

func pendingID(t *testing.T, email string) int64 {
	t.Helper()
	if _, err := auth.CreateAccessRequest("Pat Doe", email); err != nil {
		t.Fatal(err)
	}
	var id int64
	auth.DB.QueryRow(`SELECT id FROM users WHERE email = ?`, email).Scan(&id)
	return id
}

func userState(t *testing.T, id int64) (status string, role, tokenHash *string) {
	t.Helper()
	if err := auth.DB.QueryRow(`SELECT status, role, setup_token_hash FROM users WHERE id = ?`, id).
		Scan(&status, &role, &tokenHash); err != nil {
		t.Fatal(err)
	}
	return
}

func TestAdminRoutesRequireAdmin(t *testing.T) {
	env := newAdminEnv(t)
	id := pendingID(t, "pat@example.com")

	routes := [][2]string{
		{http.MethodGet, "/api/admin/requests"},
		{http.MethodPost, fmt.Sprintf("/api/admin/requests/%d/approve", id)},
		{http.MethodPost, fmt.Sprintf("/api/admin/requests/%d/deny", id)},
	}
	for _, rt := range routes {
		if rec := env.do(rt[0], rt[1], "", `{"role":"requester"}`); rec.Code != http.StatusUnauthorized {
			t.Errorf("%s %s without token: %d, want 401", rt[0], rt[1], rec.Code)
		}
		for role, tok := range env.nonAdminTokens {
			if rec := env.do(rt[0], rt[1], tok, `{"role":"admin"}`); rec.Code != http.StatusForbidden {
				t.Errorf("%s %s as %q: %d, want 403", rt[0], rt[1], role, rec.Code)
			}
		}
	}
	if status, _, _ := userState(t, id); status != "pending" {
		t.Errorf("rejected calls changed status to %q", status)
	}
	if len(env.mailer.sent) != 0 {
		t.Error("rejected calls sent email")
	}
}

func TestAdminListRequests(t *testing.T) {
	env := newAdminEnv(t)

	rec := env.do(http.MethodGet, "/api/admin/requests", env.adminToken, "")
	if rec.Code != http.StatusOK || strings.TrimSpace(rec.Body.String()) != "[]" {
		t.Fatalf("empty list: %d %q", rec.Code, rec.Body)
	}

	id := pendingID(t, "pat@example.com")
	rec = env.do(http.MethodGet, "/api/admin/requests", env.adminToken, "")
	var got []auth.PendingUser
	if err := json.NewDecoder(rec.Body).Decode(&got); err != nil {
		t.Fatal(err)
	}
	if len(got) != 1 || got[0].ID != id || got[0].Email != "pat@example.com" || got[0].Name != "Pat Doe" {
		t.Errorf("got %+v, want only the pending user (not the admin)", got)
	}
}

func TestAdminApprove(t *testing.T) {
	env := newAdminEnv(t)
	id := pendingID(t, "pat@example.com")

	rec := env.do(http.MethodPost, fmt.Sprintf("/api/admin/requests/%d/approve", id), env.adminToken, `{"role":"script viewer"}`)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body)
	}

	status, role, hash := userState(t, id)
	if status != "approved" || role == nil || *role != "script viewer" || hash == nil {
		t.Fatalf("status=%q role=%v hash=%v", status, role, hash)
	}

	if len(env.mailer.sent) != 1 || env.mailer.sent[0].to != "pat@example.com" {
		t.Fatalf("emails = %+v, want one to pat@example.com", env.mailer.sent)
	}
	body := env.mailer.sent[0].body
	token := emailedToken(t, body)
	if token == "" || auth.HashSetupToken(token) != *hash {
		t.Error("emailed token does not match the stored hash")
	}
	if strings.Contains(body, *hash) {
		t.Error("email contains the stored hash instead of only the raw token")
	}
}

func TestAdminApproveLinkIgnoresRequestHost(t *testing.T) {
	env := newAdminEnv(t)
	id := pendingID(t, "pat@example.com")

	req := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/api/admin/requests/%d/approve", id),
		strings.NewReader(`{"role":"requester"}`))
	req.Host = "evil.example.net"
	req.Header.Set("Authorization", "Bearer "+env.adminToken)
	req.Header.Set("X-Forwarded-Host", "evil.example.net")
	req.Header.Set("X-Forwarded-Proto", "http")
	req.Header.Set("Origin", "https://evil.example.net")
	req.Header.Set("Referer", "https://evil.example.net/admin")
	rec := httptest.NewRecorder()
	env.mux.ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d", rec.Code)
	}

	body := env.mailer.sent[0].body
	if strings.Contains(body, "evil") {
		t.Errorf("link built from request headers: %q", body)
	}
	emailedToken(t, body) // fails if the link does not start with APP_URL
}

func TestAdminApproveNeverLogsToken(t *testing.T) {
	env := newAdminEnv(t)
	logs := captureLog(t)

	ok := pendingID(t, "ok@example.com")
	rec := env.do(http.MethodPost, fmt.Sprintf("/api/admin/requests/%d/approve", ok), env.adminToken, `{"role":"requester"}`)
	if rec.Code != http.StatusNoContent || rec.Body.Len() != 0 {
		t.Fatalf("approve: %d %q, want 204 with empty body", rec.Code, rec.Body)
	}

	env.mailer.err = errors.New("smtp timeout")
	failed := pendingID(t, "fail@example.com")
	rec = env.do(http.MethodPost, fmt.Sprintf("/api/admin/requests/%d/approve", failed), env.adminToken, `{"role":"requester"}`)
	if rec.Code != http.StatusBadGateway {
		t.Fatalf("failed approve: %d", rec.Code)
	}

	for _, m := range env.mailer.sent {
		token := emailedToken(t, m.body)
		if strings.Contains(logs.String(), token) {
			t.Errorf("raw token for %s appears in logs:\n%s", m.to, logs)
		}
		if strings.Contains(rec.Body.String(), token) {
			t.Errorf("raw token for %s appears in the response", m.to)
		}
	}
}

func TestAdminApproveRejects(t *testing.T) {
	env := newAdminEnv(t)
	id := pendingID(t, "pat@example.com")
	path := fmt.Sprintf("/api/admin/requests/%d/approve", id)

	for name, c := range map[string]struct {
		path, body string
		want       int
	}{
		"invalid role": {path, `{"role":"superuser"}`, http.StatusBadRequest},
		"missing role": {path, `{}`, http.StatusBadRequest},
		"bad json":     {path, `{`, http.StatusBadRequest},
		"bad id":       {"/api/admin/requests/abc/approve", `{"role":"requester"}`, http.StatusBadRequest},
		"unknown id":   {"/api/admin/requests/9999/approve", `{"role":"requester"}`, http.StatusNotFound},
	} {
		if rec := env.do(http.MethodPost, c.path, env.adminToken, c.body); rec.Code != c.want {
			t.Errorf("%s: status = %d, want %d", name, rec.Code, c.want)
		}
	}
	if status, _, _ := userState(t, id); status != "pending" {
		t.Errorf("rejected approvals changed status to %q", status)
	}

	if rec := env.do(http.MethodPost, path, env.adminToken, `{"role":"requester"}`); rec.Code != http.StatusNoContent {
		t.Fatalf("first approve: %d", rec.Code)
	}
	if rec := env.do(http.MethodPost, path, env.adminToken, `{"role":"admin"}`); rec.Code != http.StatusConflict {
		t.Errorf("approve already-approved: %d, want 409", rec.Code)
	}
	if _, role, _ := userState(t, id); *role != "requester" {
		t.Errorf("second approve changed role to %q", *role)
	}
	if len(env.mailer.sent) != 1 {
		t.Errorf("emails sent = %d, want 1", len(env.mailer.sent))
	}

	if rec := env.do(http.MethodGet, path, env.adminToken, ""); rec.Code != http.StatusMethodNotAllowed {
		t.Errorf("GET approve: %d, want 405", rec.Code)
	}
}

func TestAdminApproveEmailFailureLeavesPending(t *testing.T) {
	env := newAdminEnv(t)
	env.mailer.err = errors.New("smtp down")
	id := pendingID(t, "pat@example.com")

	rec := env.do(http.MethodPost, fmt.Sprintf("/api/admin/requests/%d/approve", id), env.adminToken, `{"role":"requester"}`)
	if rec.Code != http.StatusBadGateway {
		t.Errorf("status = %d, want 502", rec.Code)
	}
	var status string
	var role, hash, expires *string
	auth.DB.QueryRow(`SELECT status, role, setup_token_hash, setup_token_expires_at FROM users WHERE id = ?`, id).
		Scan(&status, &role, &hash, &expires)
	if status != "pending" || role != nil || hash != nil || expires != nil {
		t.Errorf("status=%q role=%v hash=%v expires=%v, want pending with role/token/expiry cleared",
			status, role, hash, expires)
	}

	// The send may have reached the user before failing (e.g. a timeout); that link must be dead.
	token := emailedToken(t, env.mailer.sent[0].body)
	var matches int
	auth.DB.QueryRow(`SELECT COUNT(*) FROM users WHERE setup_token_hash = ?`, auth.HashSetupToken(token)).Scan(&matches)
	if matches != 0 {
		t.Error("token from the failed email still matches a user")
	}

	// The admin can retry, and the retry issues a different token.
	env.mailer.err = nil
	rec = env.do(http.MethodPost, fmt.Sprintf("/api/admin/requests/%d/approve", id), env.adminToken, `{"role":"requester"}`)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("retry: status = %d", rec.Code)
	}
	if emailedToken(t, env.mailer.sent[1].body) == token {
		t.Error("retry reused the failed email's token")
	}
}

func TestAdminDeny(t *testing.T) {
	env := newAdminEnv(t)
	id := pendingID(t, "pat@example.com")
	path := fmt.Sprintf("/api/admin/requests/%d/deny", id)

	if rec := env.do(http.MethodPost, path, env.adminToken, ""); rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body)
	}
	if status, role, _ := userState(t, id); status != "denied" || role != nil {
		t.Errorf("status=%q role=%v", status, role)
	}

	if rec := env.do(http.MethodPost, path, env.adminToken, ""); rec.Code != http.StatusConflict {
		t.Errorf("deny twice: %d, want 409", rec.Code)
	}
	approvePath := fmt.Sprintf("/api/admin/requests/%d/approve", id)
	if rec := env.do(http.MethodPost, approvePath, env.adminToken, `{"role":"requester"}`); rec.Code != http.StatusConflict {
		t.Errorf("approve denied user: %d, want 409", rec.Code)
	}
	if rec := env.do(http.MethodPost, "/api/admin/requests/9999/deny", env.adminToken, ""); rec.Code != http.StatusNotFound {
		t.Errorf("unknown id: %d, want 404", rec.Code)
	}
	if rec := env.do(http.MethodPost, "/api/admin/requests/abc/deny", env.adminToken, ""); rec.Code != http.StatusBadRequest {
		t.Errorf("bad id: %d, want 400", rec.Code)
	}
	if len(env.mailer.sent) != 0 {
		t.Error("deny should not send email")
	}
}
