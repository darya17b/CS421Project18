package auth

import (
	"database/sql"
	"path/filepath"
	"testing"

	"golang.org/x/crypto/bcrypt"
)

func setupDB(t *testing.T) {
	t.Helper()
	Init(filepath.Join(t.TempDir(), "auth.db"))
	t.Cleanup(func() { DB.Close() })
}

func TestMigrateDefaultsAndNullables(t *testing.T) {
	setupDB(t)

	if _, err := DB.Exec(`INSERT INTO users (name, email) VALUES ('Pat', 'pat@example.com')`); err != nil {
		t.Fatal(err)
	}

	var status, createdAt string
	var role, hash, tokenHash, tokenExpires sql.NullString
	err := DB.QueryRow(`SELECT status, role, created_at, password_hash, setup_token_hash, setup_token_expires_at
		FROM users WHERE email = 'pat@example.com'`).Scan(&status, &role, &createdAt, &hash, &tokenHash, &tokenExpires)
	if err != nil {
		t.Fatal(err)
	}
	if status != "pending" {
		t.Errorf("status = %q, want pending", status)
	}
	if createdAt == "" {
		t.Error("created_at not set")
	}
	if role.Valid || hash.Valid || tokenHash.Valid || tokenExpires.Valid {
		t.Error("nullable columns should default to NULL")
	}
}

func TestMigrateConstraints(t *testing.T) {
	setupDB(t)

	if _, err := DB.Exec(`INSERT INTO users (name, email) VALUES ('Pat', 'pat@example.com')`); err != nil {
		t.Fatal(err)
	}

	bad := map[string]string{
		"duplicate email":  `INSERT INTO users (name, email) VALUES ('Other', 'pat@example.com')`,
		"uppercase email":  `INSERT INTO users (name, email) VALUES ('Sam', 'Sam@Example.com')`,
		"invalid status":   `INSERT INTO users (name, email, status) VALUES ('Lee', 'lee@example.com', 'banned')`,
		"blank name":       `INSERT INTO users (name, email) VALUES ('  ', 'kim@example.com')`,
		"invalid role":     `INSERT INTO users (name, email, role) VALUES ('Jo', 'jo@example.com', 'user')`,
		"approved no role": `INSERT INTO users (name, email, status) VALUES ('Al', 'al@example.com', 'approved')`,
		"active no role":   `INSERT INTO users (name, email, status) VALUES ('Bo', 'bo@example.com', 'active')`,
	}
	for name, stmt := range bad {
		if _, err := DB.Exec(stmt); err == nil {
			t.Errorf("%s: expected insert to fail", name)
		}
	}

	for _, s := range []string{"pending", "denied"} {
		if _, err := DB.Exec(`INSERT INTO users (name, email, status) VALUES ('X', ?, ?)`, s+"@example.com", s); err != nil {
			t.Errorf("status %q without role rejected: %v", s, err)
		}
	}

	roles := []string{"requester", "script viewer", "script editor", "admin"}
	for i, r := range roles {
		for _, s := range []string{"approved", "active"} {
			email := s + string(rune('a'+i)) + "@example.com"
			if _, err := DB.Exec(`INSERT INTO users (name, email, role, status) VALUES ('X', ?, ?, ?)`, email, r, s); err != nil {
				t.Errorf("role %q with status %q rejected: %v", r, s, err)
			}
		}
	}
}

func TestMigrateReplacesOldTableAndIsIdempotent(t *testing.T) {
	path := filepath.Join(t.TempDir(), "auth.db")
	db, err := sql.Open("sqlite3", path)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user')`); err != nil {
		t.Fatal(err)
	}
	db.Close()

	Init(path)
	t.Cleanup(func() { DB.Close() })

	if _, err := DB.Exec(`INSERT INTO users (name, email) VALUES ('Pat', 'pat@example.com')`); err != nil {
		t.Fatalf("new schema not applied: %v", err)
	}

	if err := Migrate(DB); err != nil {
		t.Fatal(err)
	}
	var n int
	DB.QueryRow(`SELECT COUNT(*) FROM users`).Scan(&n)
	if n != 1 {
		t.Errorf("re-running Migrate changed data: %d rows", n)
	}
}

func TestCreateAdmin(t *testing.T) {
	setupDB(t)

	if err := CreateAdmin(" Admin ", "  Admin@Example.COM ", "s3cret"); err != nil {
		t.Fatal(err)
	}

	var name, email, hash, role, status string
	err := DB.QueryRow(`SELECT name, email, password_hash, role, status FROM users`).
		Scan(&name, &email, &hash, &role, &status)
	if err != nil {
		t.Fatal(err)
	}
	if name != "Admin" || email != "admin@example.com" || role != "admin" || status != "active" {
		t.Errorf("got name=%q email=%q role=%q status=%q", name, email, role, status)
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte("s3cret")) != nil {
		t.Error("password hash does not match")
	}

	if err := CreateAdmin("Again", "admin@example.com", "x"); err == nil {
		t.Error("expected duplicate admin email to fail")
	}
}

func TestActiveUserRole(t *testing.T) {
	setupDB(t)
	if err := CreateAdmin("Admin", "admin@example.com", "pw"); err != nil {
		t.Fatal(err)
	}
	var id int64
	DB.QueryRow(`SELECT id FROM users WHERE email = 'admin@example.com'`).Scan(&id)

	if role, err := ActiveUserRole(id); err != nil || role != "admin" {
		t.Errorf("active admin: role=%q err=%v", role, err)
	}
	DB.Exec(`UPDATE users SET role = 'script viewer' WHERE id = ?`, id)
	if role, _ := ActiveUserRole(id); role != "script viewer" {
		t.Errorf("after demotion: role=%q", role)
	}
	DB.Exec(`UPDATE users SET status = 'denied' WHERE id = ?`, id)
	if _, err := ActiveUserRole(id); err != ErrUserNotFound {
		t.Errorf("denied user: err=%v, want ErrUserNotFound", err)
	}
	if _, err := ActiveUserRole(9999); err != ErrUserNotFound {
		t.Errorf("unknown user: err=%v, want ErrUserNotFound", err)
	}
}

func TestAuthenticate(t *testing.T) {
	setupDB(t)
	if err := CreateAdmin("Admin", "admin@example.com", "s3cret"); err != nil {
		t.Fatal(err)
	}
	hash, _ := HashPassword("s3cret")
	_, err := DB.Exec(`INSERT INTO users (name, email, password_hash, role, status) VALUES
		('Approved', 'approved@example.com', ?, 'script viewer', 'approved'),
		('Denied', 'denied@example.com', ?, 'script viewer', 'denied')`, hash, hash)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := CreateAccessRequest("Pending", "pending@example.com"); err != nil {
		t.Fatal(err)
	}

	id, role, err := Authenticate(" ADMIN@example.com ", "s3cret")
	if err != nil || id == 0 || role != "admin" {
		t.Errorf("active admin: id=%d role=%q err=%v", id, role, err)
	}

	rejected := map[string][2]string{
		"wrong password":            {"admin@example.com", "nope"},
		"unknown email":             {"nobody@example.com", "s3cret"},
		"pending, no password":      {"pending@example.com", ""},
		"approved but not active":   {"approved@example.com", "s3cret"},
		"denied with password hash": {"denied@example.com", "s3cret"},
	}
	for name, c := range rejected {
		if _, _, err := Authenticate(c[0], c[1]); err != ErrInvalidCredentials {
			t.Errorf("%s: err = %v, want ErrInvalidCredentials", name, err)
		}
	}
}
