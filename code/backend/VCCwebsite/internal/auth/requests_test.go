package auth

import (
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"go/parser"
	"go/token"
	"strings"
	"sync"
	"testing"
	"time"
)

func addPending(t *testing.T, name, email string) int64 {
	t.Helper()
	if _, err := CreateAccessRequest(name, email); err != nil {
		t.Fatal(err)
	}
	var id int64
	if err := DB.QueryRow(`SELECT id FROM users WHERE email = ?`, email).Scan(&id); err != nil {
		t.Fatal(err)
	}
	return id
}

func adminID(t *testing.T) int64 {
	t.Helper()
	if err := CreateAdmin("Admin", "admin@example.com", "pw"); err != nil {
		t.Fatal(err)
	}
	var id int64
	DB.QueryRow(`SELECT id FROM users WHERE email = 'admin@example.com'`).Scan(&id)
	return id
}

func TestNewSetupToken(t *testing.T) {
	token, hash, err := NewSetupToken()
	if err != nil {
		t.Fatal(err)
	}
	raw, err := base64.RawURLEncoding.DecodeString(token)
	if err != nil || len(raw) != 32 {
		t.Errorf("token should be 32 random bytes, URL-safe: %q (%d bytes, %v)", token, len(raw), err)
	}
	if hash != HashSetupToken(token) || len(hash) != 64 || hash == token {
		t.Errorf("hash %q is not the SHA-256 hex of the token", hash)
	}

	other, _, _ := NewSetupToken()
	if other == token {
		t.Error("tokens should differ")
	}
}

// Guards against the token source being swapped for a non-cryptographic RNG.
func TestSetupTokenUsesCryptoRand(t *testing.T) {
	f, err := parser.ParseFile(token.NewFileSet(), "requests.go", nil, parser.ImportsOnly)
	if err != nil {
		t.Fatal(err)
	}
	imports := map[string]bool{}
	for _, imp := range f.Imports {
		imports[strings.Trim(imp.Path.Value, `"`)] = true
	}
	if !imports["crypto/rand"] {
		t.Error("requests.go must import crypto/rand")
	}
	if imports["math/rand"] || imports["math/rand/v2"] {
		t.Error("requests.go must not import math/rand")
	}
}

func TestPendingUsers(t *testing.T) {
	setupDB(t)
	adminID(t)

	users, err := PendingUsers()
	if err != nil || users == nil || len(users) != 0 {
		t.Fatalf("empty: got %v, %v; want empty non-nil slice", users, err)
	}

	a := addPending(t, "Pat", "pat@example.com")
	b := addPending(t, "Sam", "sam@example.com")
	denied := addPending(t, "Lee", "lee@example.com")
	if err := DenyRequest(denied); err != nil {
		t.Fatal(err)
	}

	users, err = PendingUsers()
	if err != nil {
		t.Fatal(err)
	}
	if len(users) != 2 || users[0].ID != a || users[1].ID != b {
		t.Fatalf("got %+v, want Pat and Sam only", users)
	}
	if users[0].Name != "Pat" || users[0].Email != "pat@example.com" || users[0].CreatedAt == "" {
		t.Errorf("fields not filled: %+v", users[0])
	}
}

func TestApproveRequest(t *testing.T) {
	setupDB(t)
	id := addPending(t, "Pat", "pat@example.com")

	before := time.Now().UTC()
	name, email, token, err := ApproveRequest(id, "script editor")
	if err != nil {
		t.Fatal(err)
	}
	if name != "Pat" || email != "pat@example.com" || token == "" {
		t.Errorf("got name=%q email=%q token=%q", name, email, token)
	}

	var status, role, storedHash, expires string
	err = DB.QueryRow(`SELECT status, role, setup_token_hash, setup_token_expires_at FROM users WHERE id = ?`, id).
		Scan(&status, &role, &storedHash, &expires)
	if err != nil {
		t.Fatal(err)
	}
	if status != "approved" || role != "script editor" {
		t.Errorf("status=%q role=%q", status, role)
	}
	sum := sha256.Sum256([]byte(token))
	if storedHash != hex.EncodeToString(sum[:]) {
		t.Error("stored value is not the SHA-256 hex of the token")
	}

	// The raw token must not appear in any column of the user's row.
	rows, err := DB.Query(`SELECT * FROM users WHERE id = ?`, id)
	if err != nil {
		t.Fatal(err)
	}
	cols, _ := rows.Columns()
	vals := make([]sql.NullString, len(cols))
	ptrs := make([]any, len(cols))
	for i := range vals {
		ptrs[i] = &vals[i]
	}
	rows.Next()
	if err := rows.Scan(ptrs...); err != nil {
		t.Fatal(err)
	}
	rows.Close()
	for i, v := range vals {
		if strings.Contains(v.String, token) {
			t.Errorf("raw token stored in column %s", cols[i])
		}
	}
	exp, err := time.Parse(sqliteTime, expires)
	if err != nil {
		t.Fatal(err)
	}
	if want := before.Add(48 * time.Hour); exp.Before(want.Add(-2*time.Second)) || exp.After(want.Add(2*time.Second)) {
		t.Errorf("expires %v, want about %v", exp, want)
	}

	var stillValid int
	DB.QueryRow(`SELECT setup_token_expires_at > datetime('now') FROM users WHERE id = ?`, id).Scan(&stillValid)
	if stillValid != 1 {
		t.Error("expiry should compare as future against datetime('now')")
	}
}

func TestApproveRequestRejects(t *testing.T) {
	setupDB(t)
	admin := adminID(t)
	pending := addPending(t, "Pat", "pat@example.com")
	denied := addPending(t, "Lee", "lee@example.com")
	DenyRequest(denied)

	for _, role := range []string{"superuser", "", "Admin", "user"} {
		if _, _, _, err := ApproveRequest(pending, role); err != ErrInvalidRole {
			t.Errorf("role %q: err = %v, want ErrInvalidRole (checked before the DB)", role, err)
		}
	}
	var status string
	DB.QueryRow(`SELECT status FROM users WHERE id = ?`, pending).Scan(&status)
	if status != "pending" {
		t.Errorf("invalid role changed status to %q", status)
	}

	cases := map[string]struct {
		id   int64
		want error
	}{
		"unknown id":   {9999, ErrUserNotFound},
		"active admin": {admin, ErrNotPending},
		"denied user":  {denied, ErrNotPending},
	}
	for name, c := range cases {
		if _, _, _, err := ApproveRequest(c.id, "requester"); err != c.want {
			t.Errorf("%s: err = %v, want %v", name, err, c.want)
		}
	}

	if _, _, _, err := ApproveRequest(pending, "requester"); err != nil {
		t.Fatal(err)
	}
	var role, hash, expires string
	DB.QueryRow(`SELECT role, setup_token_hash, setup_token_expires_at FROM users WHERE id = ?`, pending).
		Scan(&role, &hash, &expires)

	if _, _, _, err := ApproveRequest(pending, "admin"); err != ErrNotPending {
		t.Errorf("second approve: err = %v, want ErrNotPending", err)
	}
	var role2, hash2, expires2 string
	DB.QueryRow(`SELECT role, setup_token_hash, setup_token_expires_at FROM users WHERE id = ?`, pending).
		Scan(&role2, &hash2, &expires2)
	if role2 != role || hash2 != hash || expires2 != expires {
		t.Error("failed second approve changed role, token or expiry")
	}
}

func TestApproveRequestConcurrent(t *testing.T) {
	setupDB(t)
	id := addPending(t, "Pat", "pat@example.com")

	const admins = 20
	roles := []string{"requester", "script viewer", "script editor", "admin"}
	errs := make(chan error, admins)
	tokens := make(chan string, admins)
	start := make(chan struct{})
	var wg sync.WaitGroup
	for i := 0; i < admins; i++ {
		wg.Add(1)
		go func(role string) {
			defer wg.Done()
			<-start
			_, _, token, err := ApproveRequest(id, role)
			errs <- err
			if err == nil {
				tokens <- token
			}
		}(roles[i%len(roles)])
	}
	close(start)
	wg.Wait()
	close(errs)
	close(tokens)

	wins := 0
	for err := range errs {
		switch err {
		case nil:
			wins++
		case ErrNotPending:
		default:
			t.Errorf("unexpected error: %v", err)
		}
	}
	if wins != 1 {
		t.Fatalf("%d approvals succeeded, want exactly 1", wins)
	}
	var storedHash string
	DB.QueryRow(`SELECT setup_token_hash FROM users WHERE id = ?`, id).Scan(&storedHash)
	if winner := <-tokens; HashSetupToken(winner) != storedHash {
		t.Error("stored token is not the winning approval's token")
	}
}

func TestRevertApproval(t *testing.T) {
	setupDB(t)
	id := addPending(t, "Pat", "pat@example.com")
	_, _, token, err := ApproveRequest(id, "requester")
	if err != nil {
		t.Fatal(err)
	}

	if err := RevertApproval(id, "some-other-token"); err != nil {
		t.Fatal(err)
	}
	var status string
	DB.QueryRow(`SELECT status FROM users WHERE id = ?`, id).Scan(&status)
	if status != "approved" {
		t.Error("revert with the wrong token should change nothing")
	}

	if err := RevertApproval(id, token); err != nil {
		t.Fatal(err)
	}
	var role, hash, expires sql.NullString
	DB.QueryRow(`SELECT status, role, setup_token_hash, setup_token_expires_at FROM users WHERE id = ?`, id).
		Scan(&status, &role, &hash, &expires)
	if status != "pending" || role.Valid || hash.Valid || expires.Valid {
		t.Errorf("not fully reverted: status=%q role=%v hash=%v expires=%v", status, role, hash, expires)
	}
}

func TestDenyRequest(t *testing.T) {
	setupDB(t)
	admin := adminID(t)
	id := addPending(t, "Pat", "pat@example.com")

	if err := DenyRequest(id); err != nil {
		t.Fatal(err)
	}
	var status string
	var role sql.NullString
	DB.QueryRow(`SELECT status, role FROM users WHERE id = ?`, id).Scan(&status, &role)
	if status != "denied" || role.Valid {
		t.Errorf("status=%q role=%v", status, role)
	}

	if err := DenyRequest(id); err != ErrNotPending {
		t.Errorf("deny twice: err = %v, want ErrNotPending", err)
	}
	if err := DenyRequest(admin); err != ErrNotPending {
		t.Errorf("deny active admin: err = %v, want ErrNotPending", err)
	}
	if err := DenyRequest(9999); err != ErrUserNotFound {
		t.Errorf("deny unknown: err = %v, want ErrUserNotFound", err)
	}
}
