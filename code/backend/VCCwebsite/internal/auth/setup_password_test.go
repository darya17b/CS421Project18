package auth

import (
	"database/sql"
	"strings"
	"sync"
	"testing"
)

const goodPassword = "correct horse battery"

// approvedUser creates a pending user, approves them and returns the id and raw setup token.
func approvedUser(t *testing.T, email string) (int64, string) {
	t.Helper()
	id := addPending(t, "Pat", email)
	_, _, token, err := ApproveRequest(id, "script viewer")
	if err != nil {
		t.Fatal(err)
	}
	return id, token
}

func TestValidatePassword(t *testing.T) {
	cases := map[string]struct {
		password string
		want     error
	}{
		"7 chars":           {strings.Repeat("a", 7), ErrPasswordTooShort},
		"empty":             {"", ErrPasswordTooShort},
		"8 chars":           {strings.Repeat("a", 8), nil},
		"72 bytes":          {strings.Repeat("a", 72), nil},
		"73 bytes":          {strings.Repeat("a", 73), ErrPasswordTooLong},
		"8 multibyte chars": {strings.Repeat("é", 8), nil},
		"7 multibyte chars": {strings.Repeat("é", 7), ErrPasswordTooShort},
		"37 two-byte chars": {strings.Repeat("é", 37), ErrPasswordTooLong},
	}
	for name, c := range cases {
		if err := ValidatePassword(c.password); err != c.want {
			t.Errorf("%s: err = %v, want %v", name, err, c.want)
		}
	}
}

func TestSetupPassword(t *testing.T) {
	setupDB(t)
	id, token := approvedUser(t, "pat@example.com")

	if err := SetupPassword(token, goodPassword); err != nil {
		t.Fatal(err)
	}

	var status, role string
	var hash, tokenHash, expires sql.NullString
	DB.QueryRow(`SELECT status, role, password_hash, setup_token_hash, setup_token_expires_at FROM users WHERE id = ?`, id).
		Scan(&status, &role, &hash, &tokenHash, &expires)
	if status != "active" || role != "script viewer" {
		t.Errorf("status=%q role=%q, want active / script viewer", status, role)
	}
	if !hash.Valid || hash.String == goodPassword || !CheckPassword(hash.String, goodPassword) {
		t.Error("password not stored as a matching bcrypt hash")
	}
	if tokenHash.Valid || expires.Valid {
		t.Errorf("token fields not cleared: hash=%v expires=%v", tokenHash, expires)
	}

	if gotID, gotRole, err := Authenticate("pat@example.com", goodPassword); err != nil || gotID != id || gotRole != "script viewer" {
		t.Errorf("login after setup: id=%d role=%q err=%v", gotID, gotRole, err)
	}
}

func TestSetupPasswordTokenWorksOnce(t *testing.T) {
	setupDB(t)
	_, token := approvedUser(t, "pat@example.com")

	if err := SetupPassword(token, goodPassword); err != nil {
		t.Fatal(err)
	}
	if err := SetupPassword(token, "a different password"); err != ErrInvalidSetupToken {
		t.Errorf("second use: err = %v, want ErrInvalidSetupToken", err)
	}
	if _, _, err := Authenticate("pat@example.com", goodPassword); err != nil {
		t.Error("second use changed the password")
	}
}

func TestSetupPasswordConcurrentUse(t *testing.T) {
	setupDB(t)
	_, token := approvedUser(t, "pat@example.com")

	const tries = 10
	errs := make(chan error, tries)
	start := make(chan struct{})
	var wg sync.WaitGroup
	for i := 0; i < tries; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-start
			errs <- SetupPassword(token, goodPassword)
		}()
	}
	close(start)
	wg.Wait()
	close(errs)

	wins := 0
	for err := range errs {
		switch err {
		case nil:
			wins++
		case ErrInvalidSetupToken:
		default:
			t.Errorf("unexpected error: %v", err)
		}
	}
	if wins != 1 {
		t.Errorf("%d uses succeeded, want exactly 1", wins)
	}
}

func TestSetupPasswordRejects(t *testing.T) {
	setupDB(t)

	expiredID, expired := approvedUser(t, "expired@example.com")
	DB.Exec(`UPDATE users SET setup_token_expires_at = datetime('now', '-1 second') WHERE id = ?`, expiredID)

	deniedID, denied := approvedUser(t, "denied@example.com")
	DB.Exec(`UPDATE users SET status = 'denied' WHERE id = ?`, deniedID)

	// An approved user's token must not be accepted once the user is active by other means.
	activeID, alreadyActive := approvedUser(t, "active@example.com")
	DB.Exec(`UPDATE users SET status = 'active', password_hash = 'x' WHERE id = ?`, activeID)

	for name, tok := range map[string]string{
		"expired":             expired,
		"user denied":         denied,
		"user already active": alreadyActive,
		"unknown token":       "not-a-real-token",
		"empty token":         "",
	} {
		if err := SetupPassword(tok, goodPassword); err != ErrInvalidSetupToken {
			t.Errorf("%s: err = %v, want ErrInvalidSetupToken", name, err)
		}
	}

	var status string
	DB.QueryRow(`SELECT status FROM users WHERE id = ?`, expiredID).Scan(&status)
	if status != "approved" {
		t.Errorf("expired token changed status to %q", status)
	}
}

func TestSetupPasswordBadPasswordKeepsToken(t *testing.T) {
	setupDB(t)
	id, token := approvedUser(t, "pat@example.com")

	if err := SetupPassword(token, "sevench"); err != ErrPasswordTooShort {
		t.Errorf("7-char password: err = %v, want ErrPasswordTooShort", err)
	}
	if err := SetupPassword(token, strings.Repeat("x", 73)); err != ErrPasswordTooLong {
		t.Errorf("73-byte password: err = %v, want ErrPasswordTooLong", err)
	}

	var status string
	var hash sql.NullString
	DB.QueryRow(`SELECT status, password_hash FROM users WHERE id = ?`, id).Scan(&status, &hash)
	if status != "approved" || hash.Valid {
		t.Errorf("rejected password changed the user: status=%q hash=%v", status, hash)
	}
	if err := SetupPassword(token, "twelve chars"); err != nil {
		t.Errorf("token should still work after a rejected password: %v", err)
	}
}
