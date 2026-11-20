package handler

import (
	"VCCwebsite/internal/auth"
	"errors"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
)

type sentMail struct{ to, subject, body string }

type fakeMailer struct {
	sent []sentMail
	err  error
}

func (m *fakeMailer) Send(to, subject, body string) error {
	m.sent = append(m.sent, sentMail{to, subject, body})
	return m.err
}

func setupAuthDB(t *testing.T) {
	t.Helper()
	auth.Init(filepath.Join(t.TempDir(), "auth.db"))
	t.Cleanup(func() { auth.DB.Close() })
	if err := auth.CreateAdmin("Admin", "admin@example.com", "pw"); err != nil {
		t.Fatal(err)
	}
}

func postAccessRequest(h http.HandlerFunc, body string) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	h(rec, httptest.NewRequest(http.MethodPost, "/api/access-requests", strings.NewReader(body)))
	return rec
}

func countUsers(t *testing.T, email string) int {
	t.Helper()
	var n int
	if err := auth.DB.QueryRow(`SELECT COUNT(*) FROM users WHERE email = ?`, email).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

func TestAccessRequestCreatesPendingUserAndNotifiesAdmin(t *testing.T) {
	setupAuthDB(t)
	m := &fakeMailer{}

	rec := postAccessRequest(AccessRequests(m), `{"name":" Pat Doe ","email":" Pat@Example.com "}`)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body)
	}

	var name, status string
	var role *string
	err := auth.DB.QueryRow(`SELECT name, status, role FROM users WHERE email = 'pat@example.com'`).
		Scan(&name, &status, &role)
	if err != nil {
		t.Fatal(err)
	}
	if name != "Pat Doe" || status != "pending" || role != nil {
		t.Errorf("got name=%q status=%q role=%v", name, status, role)
	}

	if len(m.sent) != 1 || m.sent[0].to != "admin@example.com" ||
		!strings.Contains(m.sent[0].body, "pat@example.com") {
		t.Errorf("unexpected notifications: %+v", m.sent)
	}
}

func TestAccessRequestDuplicateEmailLooksIdentical(t *testing.T) {
	setupAuthDB(t)
	m := &fakeMailer{}
	h := AccessRequests(m)

	first := postAccessRequest(h, `{"name":"Pat","email":"pat@example.com"}`)
	second := postAccessRequest(h, `{"name":"Someone Else","email":"PAT@example.com"}`)
	existingAdmin := postAccessRequest(h, `{"name":"Imposter","email":"admin@example.com"}`)

	for _, rec := range []*httptest.ResponseRecorder{second, existingAdmin} {
		if rec.Code != first.Code || rec.Body.String() != first.Body.String() {
			t.Errorf("duplicate response %d %q differs from first %d %q",
				rec.Code, rec.Body, first.Code, first.Body)
		}
	}
	if n := countUsers(t, "pat@example.com"); n != 1 {
		t.Errorf("rows for pat = %d, want 1", n)
	}
	var name string
	auth.DB.QueryRow(`SELECT name FROM users WHERE email = 'pat@example.com'`).Scan(&name)
	if name != "Pat" {
		t.Errorf("existing user was modified: name = %q", name)
	}
	if len(m.sent) != 1 {
		t.Errorf("notifications sent = %d, want 1", len(m.sent))
	}
}

func TestAccessRequestValidation(t *testing.T) {
	setupAuthDB(t)
	m := &fakeMailer{}
	h := AccessRequests(m)

	cases := map[string]string{
		"bad json":       `{`,
		"missing name":   `{"email":"a@example.com"}`,
		"blank name":     `{"name":"   ","email":"a@example.com"}`,
		"missing email":  `{"name":"A"}`,
		"invalid email":  `{"name":"A","email":"not-an-email"}`,
		"display name":   `{"name":"A","email":"A <a@example.com>"}`,
		"no domain part": `{"name":"A","email":"a@"}`,
	}
	for name, body := range cases {
		if rec := postAccessRequest(h, body); rec.Code != http.StatusBadRequest {
			t.Errorf("%s: status = %d, want 400", name, rec.Code)
		}
	}
	if n := countUsers(t, "a@example.com"); n != 0 {
		t.Errorf("invalid requests created %d rows", n)
	}
	if len(m.sent) != 0 {
		t.Errorf("invalid requests sent %d notifications", len(m.sent))
	}
}

func TestAccessRequestMethodNotAllowed(t *testing.T) {
	rec := httptest.NewRecorder()
	AccessRequests(&fakeMailer{})(rec, httptest.NewRequest(http.MethodGet, "/api/access-requests", nil))
	if rec.Code != http.StatusMethodNotAllowed {
		t.Errorf("status = %d, want 405", rec.Code)
	}
}

func TestAccessRequestSucceedsWhenMailerFails(t *testing.T) {
	setupAuthDB(t)
	m := &fakeMailer{err: errors.New("smtp down")}

	rec := postAccessRequest(AccessRequests(m), `{"name":"Pat","email":"pat@example.com"}`)
	if rec.Code != http.StatusAccepted {
		t.Errorf("status = %d, want 202", rec.Code)
	}
	if n := countUsers(t, "pat@example.com"); n != 1 {
		t.Errorf("rows = %d, want 1", n)
	}
}
