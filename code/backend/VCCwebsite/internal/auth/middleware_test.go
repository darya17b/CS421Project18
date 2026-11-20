package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const testSecret = "test-secret"

func newTestMiddleware(t *testing.T) *AuthMiddleware {
	t.Helper()
	am, err := NewAuthMiddleware(testSecret)
	if err != nil {
		t.Fatal(err)
	}
	return am
}

func signRaw(t *testing.T, method jwt.SigningMethod, secret string, claims jwt.Claims) string {
	t.Helper()
	s, err := jwt.NewWithClaims(method, claims).SignedString([]byte(secret))
	if err != nil {
		t.Fatal(err)
	}
	return s
}

func TestNewAuthMiddlewareRequiresSecret(t *testing.T) {
	if _, err := NewAuthMiddleware(""); err == nil {
		t.Error("expected error for empty secret")
	}
}

func TestIssueAndVerifyToken(t *testing.T) {
	am := newTestMiddleware(t)

	tok, err := am.IssueToken(42, "script editor")
	if err != nil {
		t.Fatal(err)
	}
	id, err := am.VerifyToken(tok)
	if err != nil {
		t.Fatal(err)
	}
	if id != 42 {
		t.Errorf("user id = %d, want 42", id)
	}

	noRole := signRaw(t, jwt.SigningMethodHS256, testSecret, jwtClaims{RegisteredClaims: jwt.RegisteredClaims{
		Subject: "42", ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
	}})
	if id, err := am.VerifyToken(noRole); err != nil || id != 42 {
		t.Errorf("token without role claim: id=%d err=%v; only the user id is needed", id, err)
	}

	var raw jwtClaims
	if _, _, err := jwt.NewParser().ParseUnverified(tok, &raw); err != nil {
		t.Fatal(err)
	}
	if ttl := raw.ExpiresAt.Sub(raw.IssuedAt.Time); ttl != time.Hour {
		t.Errorf("token lifetime = %v, want 1h", ttl)
	}
}

func TestVerifyTokenRejects(t *testing.T) {
	am := newTestMiddleware(t)
	valid := func(exp time.Time) jwtClaims {
		return jwtClaims{Role: "admin", RegisteredClaims: jwt.RegisteredClaims{
			Subject: "1", ExpiresAt: jwt.NewNumericDate(exp),
		}}
	}
	future := time.Now().Add(time.Hour)

	cases := map[string]string{
		"expired":      signRaw(t, jwt.SigningMethodHS256, testSecret, valid(time.Now().Add(-time.Minute))),
		"wrong secret": signRaw(t, jwt.SigningMethodHS256, "other-secret", valid(future)),
		"other alg":    signRaw(t, jwt.SigningMethodHS512, testSecret, valid(future)),
		"no expiry": signRaw(t, jwt.SigningMethodHS256, testSecret,
			jwtClaims{Role: "admin", RegisteredClaims: jwt.RegisteredClaims{Subject: "1"}}),
		"non-numeric subject": signRaw(t, jwt.SigningMethodHS256, testSecret,
			jwtClaims{Role: "admin", RegisteredClaims: jwt.RegisteredClaims{Subject: "bob", ExpiresAt: jwt.NewNumericDate(future)}}),
		"garbage": "not.a.token",
	}
	for name, tok := range cases {
		if _, err := am.VerifyToken(tok); err == nil {
			t.Errorf("%s: expected rejection", name)
		}
	}
}

func serve(h http.Handler, authHeader string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	if authHeader != "" {
		req.Header.Set("Authorization", authHeader)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

// activeUser inserts an active user with the given role and returns its id.
func activeUser(t *testing.T, email, role string) int64 {
	t.Helper()
	res, err := DB.Exec(`INSERT INTO users (name, email, password_hash, role, status) VALUES ('U', ?, 'x', ?, 'active')`, email, role)
	if err != nil {
		t.Fatal(err)
	}
	id, _ := res.LastInsertId()
	return id
}

func TestMiddleware(t *testing.T) {
	setupDB(t)
	am := newTestMiddleware(t)
	var got *Claims
	h := am.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got, _ = GetClaimsFromContext(r.Context())
	}))

	id := activeUser(t, "req@example.com", "requester")
	tok, _ := am.IssueToken(id, "requester")
	if rec := serve(h, "Bearer "+tok); rec.Code != http.StatusOK {
		t.Fatalf("valid token: status = %d", rec.Code)
	}
	if got == nil || got.UserID != id || got.Role != "requester" {
		t.Errorf("claims in context = %+v", got)
	}

	for name, header := range map[string]string{
		"no header":     "",
		"wrong scheme":  "Basic " + tok,
		"no token":      "Bearer ",
		"bare token":    tok,
		"invalid token": "Bearer not.a.token",
	} {
		if rec := serve(h, header); rec.Code != http.StatusUnauthorized {
			t.Errorf("%s: status = %d, want 401", name, rec.Code)
		}
	}
}

func TestMiddlewareUsesDatabaseNotTokenRole(t *testing.T) {
	setupDB(t)
	am := newTestMiddleware(t)
	var got *Claims
	h := am.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got, _ = GetClaimsFromContext(r.Context())
	}))

	viewer := activeUser(t, "viewer@example.com", "script viewer")
	claimsAdmin, _ := am.IssueToken(viewer, "admin")
	if rec := serve(h, "Bearer "+claimsAdmin); rec.Code != http.StatusOK {
		t.Fatalf("status = %d", rec.Code)
	}
	if got.Role != "script viewer" {
		t.Errorf("role in context = %q, want database role 'script viewer'", got.Role)
	}
	if rec := serve(am.Middleware(RequireAdmin(h)), "Bearer "+claimsAdmin); rec.Code != http.StatusForbidden {
		t.Errorf("token claiming admin for a viewer: status = %d, want 403", rec.Code)
	}

	unknown, _ := am.IssueToken(9999, "admin")
	if rec := serve(h, "Bearer "+unknown); rec.Code != http.StatusUnauthorized {
		t.Errorf("token for nonexistent user: status = %d, want 401", rec.Code)
	}

	for _, status := range []string{"pending", "approved", "denied"} {
		res, err := DB.Exec(`INSERT INTO users (name, email, role, status) VALUES ('U', ?, 'admin', ?)`, status+"@example.com", status)
		if err != nil {
			t.Fatal(err)
		}
		id, _ := res.LastInsertId()
		tok, _ := am.IssueToken(id, "admin")
		if rec := serve(h, "Bearer "+tok); rec.Code != http.StatusUnauthorized {
			t.Errorf("%s user: status = %d, want 401", status, rec.Code)
		}
	}
}

func TestRequireAdmin(t *testing.T) {
	setupDB(t)
	am := newTestMiddleware(t)
	ok := http.HandlerFunc(func(http.ResponseWriter, *http.Request) {})
	protected := am.Middleware(RequireAdmin(ok))

	for role, want := range map[string]int{
		"admin":         http.StatusOK,
		"script editor": http.StatusForbidden,
		"script viewer": http.StatusForbidden,
		"requester":     http.StatusForbidden,
	} {
		id := activeUser(t, role+"@example.com", role)
		tok, _ := am.IssueToken(id, role)
		if rec := serve(protected, "Bearer "+tok); rec.Code != want {
			t.Errorf("role %q: status = %d, want %d", role, rec.Code, want)
		}
	}

	// Without the auth middleware in front there are no claims, so it must refuse.
	if rec := serve(RequireAdmin(ok), ""); rec.Code != http.StatusUnauthorized {
		t.Errorf("no claims: status = %d, want 401", rec.Code)
	}
}
