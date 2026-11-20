package handler

import (
	"VCCwebsite/internal/auth"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func serveWith(h http.Handler, token string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodGet, "/api/user", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

// These tests log in through the real login handler, change the user in the
// database, and then reuse the still-unexpired token.

func (e *adminEnv) login(t *testing.T, email, password string) string {
	t.Helper()
	rec := postLogin(Login(e.am), `{"email":"`+email+`","password":"`+password+`"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("login %s: status = %d", email, rec.Code)
	}
	var resp struct{ Token string }
	json.NewDecoder(rec.Body).Decode(&resp)
	return resp.Token
}

var adminRoutes = [][2]string{
	{http.MethodGet, "/api/admin/requests"},
	{http.MethodPost, "/api/admin/requests/9999/approve"},
	{http.MethodPost, "/api/admin/requests/9999/deny"},
}

func TestDemotedAdminTokenGets403(t *testing.T) {
	env := newAdminEnv(t)
	second := insertActiveUser(t, "second.admin@example.com", "admin", "pw2")
	token := env.login(t, "second.admin@example.com", "pw2")

	if rec := env.do(http.MethodGet, "/api/admin/requests", token, ""); rec.Code != http.StatusOK {
		t.Fatalf("before demotion: status = %d, want 200", rec.Code)
	}

	if _, err := auth.DB.Exec(`UPDATE users SET role = 'script editor' WHERE id = ?`, second); err != nil {
		t.Fatal(err)
	}
	for _, rt := range adminRoutes {
		if rec := env.do(rt[0], rt[1], token, `{"role":"admin"}`); rec.Code != http.StatusForbidden {
			t.Errorf("%s %s after demotion: status = %d, want 403", rt[0], rt[1], rec.Code)
		}
	}

	// Still a valid, active user, so non-admin protected routes keep working.
	user := env.am.Middleware(User())
	rec := serveWith(user, token)
	if rec.Code != http.StatusOK {
		t.Fatalf("/api/user after demotion: status = %d, want 200", rec.Code)
	}
	var me struct{ Role string }
	json.NewDecoder(rec.Body).Decode(&me)
	if me.Role != "script editor" {
		t.Errorf("/api/user role = %q, want the database role 'script editor'", me.Role)
	}
}

func TestDeactivatedUserTokenGets401(t *testing.T) {
	for _, status := range []string{"pending", "approved", "denied"} {
		t.Run(status, func(t *testing.T) {
			env := newAdminEnv(t)
			id := insertActiveUser(t, "pat@example.com", "admin", "pw2")
			token := env.login(t, "pat@example.com", "pw2")
			user := env.am.Middleware(User())

			if rec := serveWith(user, token); rec.Code != http.StatusOK {
				t.Fatalf("while active: status = %d, want 200", rec.Code)
			}

			if _, err := auth.DB.Exec(`UPDATE users SET status = ? WHERE id = ?`, status, id); err != nil {
				t.Fatal(err)
			}
			if rec := serveWith(user, token); rec.Code != http.StatusUnauthorized {
				t.Errorf("/api/user: status = %d, want 401", rec.Code)
			}
			for _, rt := range adminRoutes {
				if rec := env.do(rt[0], rt[1], token, `{"role":"admin"}`); rec.Code != http.StatusUnauthorized {
					t.Errorf("%s %s: status = %d, want 401", rt[0], rt[1], rec.Code)
				}
			}
		})
	}
}

func TestDeletedUserTokenGets401(t *testing.T) {
	env := newAdminEnv(t)
	id := insertActiveUser(t, "pat@example.com", "admin", "pw2")
	token := env.login(t, "pat@example.com", "pw2")
	user := env.am.Middleware(User())

	if rec := serveWith(user, token); rec.Code != http.StatusOK {
		t.Fatalf("before delete: status = %d, want 200", rec.Code)
	}

	if _, err := auth.DB.Exec(`DELETE FROM users WHERE id = ?`, id); err != nil {
		t.Fatal(err)
	}
	if rec := serveWith(user, token); rec.Code != http.StatusUnauthorized {
		t.Errorf("/api/user: status = %d, want 401", rec.Code)
	}
	for _, rt := range adminRoutes {
		if rec := env.do(rt[0], rt[1], token, `{"role":"admin"}`); rec.Code != http.StatusUnauthorized {
			t.Errorf("%s %s: status = %d, want 401", rt[0], rt[1], rec.Code)
		}
	}
}
