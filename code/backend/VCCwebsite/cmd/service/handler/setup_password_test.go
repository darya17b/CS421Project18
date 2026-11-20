package handler

import (
	"VCCwebsite/internal/auth"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func postSetupPassword(body string) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	SetupPassword()(rec, httptest.NewRequest(http.MethodPost, "/api/auth/setup-password", strings.NewReader(body)))
	return rec
}

func setupBody(token, password string) string {
	return `{"token":"` + token + `","password":"` + password + `"}`
}

// approvedToken creates and approves a request and returns the raw setup token.
func approvedToken(t *testing.T, email string) string {
	t.Helper()
	id := pendingID(t, email)
	_, _, token, err := auth.ApproveRequest(id, "script editor")
	if err != nil {
		t.Fatal(err)
	}
	return token
}

func TestSetupPasswordThenLogin(t *testing.T) {
	env := newAdminEnv(t)
	token := approvedToken(t, "pat@example.com")

	if rec := postLogin(Login(env.am), `{"email":"pat@example.com","password":"correct horse battery"}`); rec.Code != http.StatusUnauthorized {
		t.Fatalf("login before setup: status = %d, want 401", rec.Code)
	}

	if rec := postSetupPassword(setupBody(token, "correct horse battery")); rec.Code != http.StatusNoContent {
		t.Fatalf("setup: status = %d, body = %s", rec.Code, rec.Body)
	}

	tok := env.login(t, "pat@example.com", "correct horse battery")
	if rec := serveWith(env.am.Middleware(User()), tok); rec.Code != http.StatusOK ||
		!strings.Contains(rec.Body.String(), `"role":"script editor"`) {
		t.Errorf("/api/user after setup: %d %s", rec.Code, rec.Body)
	}
}

func TestSetupPasswordTokenSingleUse(t *testing.T) {
	newAdminEnv(t)
	token := approvedToken(t, "pat@example.com")

	if rec := postSetupPassword(setupBody(token, "correct horse battery")); rec.Code != http.StatusNoContent {
		t.Fatalf("first use: status = %d", rec.Code)
	}
	rec := postSetupPassword(setupBody(token, "attacker password!"))
	if rec.Code != http.StatusBadRequest {
		t.Errorf("second use: status = %d, want 400", rec.Code)
	}
	if !auth.CheckPassword(storedHash(t, "pat@example.com"), "correct horse battery") {
		t.Error("second use changed the password")
	}
}

func TestSetupPasswordInvalidAndExpiredLookTheSame(t *testing.T) {
	newAdminEnv(t)
	expired := approvedToken(t, "expired@example.com")
	auth.DB.Exec(`UPDATE users SET setup_token_expires_at = datetime('now', '-1 second') WHERE email = 'expired@example.com'`)

	unknown := postSetupPassword(setupBody("not-a-real-token", "correct horse battery"))
	if unknown.Code != http.StatusBadRequest {
		t.Fatalf("unknown token: status = %d, want 400", unknown.Code)
	}
	exp := postSetupPassword(setupBody(expired, "correct horse battery"))
	if exp.Code != unknown.Code || exp.Body.String() != unknown.Body.String() {
		t.Errorf("expired %d %q differs from unknown %d %q", exp.Code, exp.Body, unknown.Code, unknown.Body)
	}
}

func TestSetupPasswordValidation(t *testing.T) {
	newAdminEnv(t)
	token := approvedToken(t, "pat@example.com")

	for name, c := range map[string]struct {
		body     string
		wantText string
	}{
		"7-char password":  {setupBody(token, "sevench"), "at least 8"},
		"empty password":   {setupBody(token, ""), "at least 8"},
		"73-byte password": {setupBody(token, strings.Repeat("x", 73)), "at most 72"},
		"bad json":         {`{`, "bad request"},
	} {
		rec := postSetupPassword(c.body)
		if rec.Code != http.StatusBadRequest || !strings.Contains(rec.Body.String(), c.wantText) {
			t.Errorf("%s: %d %q, want 400 containing %q", name, rec.Code, rec.Body, c.wantText)
		}
	}

	// None of the rejected attempts used up the token.
	if rec := postSetupPassword(setupBody(token, "twelve chars")); rec.Code != http.StatusNoContent {
		t.Errorf("valid password after rejections: status = %d", rec.Code)
	}

	rec := httptest.NewRecorder()
	SetupPassword()(rec, httptest.NewRequest(http.MethodGet, "/api/auth/setup-password", nil))
	if rec.Code != http.StatusMethodNotAllowed {
		t.Errorf("GET: status = %d, want 405", rec.Code)
	}
}

func storedHash(t *testing.T, email string) string {
	t.Helper()
	var hash string
	if err := auth.DB.QueryRow(`SELECT password_hash FROM users WHERE email = ?`, email).Scan(&hash); err != nil {
		t.Fatal(err)
	}
	return hash
}
