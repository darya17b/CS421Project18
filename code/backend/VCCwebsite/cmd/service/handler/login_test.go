package handler

import (
	"VCCwebsite/internal/auth"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func postLogin(h http.HandlerFunc, body string) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	h(rec, httptest.NewRequest(http.MethodPost, "/api/auth/login", strings.NewReader(body)))
	return rec
}

func newLoginHandler(t *testing.T) (http.HandlerFunc, *auth.AuthMiddleware) {
	t.Helper()
	setupAuthDB(t) // seeds admin@example.com / pw
	am, err := auth.NewAuthMiddleware("test-secret")
	if err != nil {
		t.Fatal(err)
	}
	return Login(am), am
}

func TestLoginReturnsVerifiableToken(t *testing.T) {
	h, am := newLoginHandler(t)

	rec := postLogin(h, `{"email":"Admin@Example.com","password":"pw"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body)
	}
	var resp struct{ Token string }
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatal(err)
	}
	userID, err := am.VerifyToken(resp.Token)
	if err != nil {
		t.Fatal(err)
	}
	var adminID int64
	auth.DB.QueryRow(`SELECT id FROM users WHERE email = 'admin@example.com'`).Scan(&adminID)
	if userID != adminID {
		t.Errorf("token user id = %d, want %d", userID, adminID)
	}
}

func TestLoginFailuresAreIndistinguishable(t *testing.T) {
	h, _ := newLoginHandler(t)
	hash, _ := auth.HashPassword("pw")
	_, err := auth.DB.Exec(`INSERT INTO users (name, email, password_hash, role, status)
		VALUES ('Approved', 'approved@example.com', ?, 'script viewer', 'approved')`, hash)
	if err != nil {
		t.Fatal(err)
	}
	auth.CreateAccessRequest("Pending", "pending@example.com")

	wrongPassword := postLogin(h, `{"email":"admin@example.com","password":"wrong"}`)
	if wrongPassword.Code != http.StatusUnauthorized {
		t.Fatalf("wrong password: status = %d", wrongPassword.Code)
	}

	for name, body := range map[string]string{
		"wrong email":         `{"email":"nobody@example.com","password":"pw"}`,
		"pending user":        `{"email":"pending@example.com","password":""}`,
		"approved not active": `{"email":"approved@example.com","password":"pw"}`,
	} {
		rec := postLogin(h, body)
		if rec.Code != wrongPassword.Code || rec.Body.String() != wrongPassword.Body.String() {
			t.Errorf("%s: got %d %q, want %d %q", name,
				rec.Code, rec.Body, wrongPassword.Code, wrongPassword.Body)
		}
	}
}

func TestLoginBadRequests(t *testing.T) {
	h, _ := newLoginHandler(t)

	if rec := postLogin(h, `{`); rec.Code != http.StatusBadRequest {
		t.Errorf("bad json: status = %d, want 400", rec.Code)
	}

	rec := httptest.NewRecorder()
	h(rec, httptest.NewRequest(http.MethodGet, "/api/auth/login", nil))
	if rec.Code != http.StatusMethodNotAllowed {
		t.Errorf("GET: status = %d, want 405", rec.Code)
	}
}
