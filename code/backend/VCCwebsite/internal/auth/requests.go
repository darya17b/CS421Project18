package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"time"
)

const SetupTokenTTL = 48 * time.Hour

// sqliteTime matches datetime('now'), so stored times compare correctly in SQL.
const sqliteTime = "2006-01-02 15:04:05"

var (
	ErrUserNotFound = errors.New("user not found")
	ErrNotPending   = errors.New("user is not pending")
	ErrInvalidRole  = errors.New("invalid role")

	ErrInvalidSetupToken = errors.New("invalid or expired setup link")
)

func ValidRole(role string) bool {
	switch role {
	case "requester", "script viewer", "script editor", "admin":
		return true
	}
	return false
}

type PendingUser struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	CreatedAt string `json:"created_at"`
}

func PendingUsers() ([]PendingUser, error) {
	rows, err := DB.Query(`SELECT id, name, email, created_at FROM users WHERE status = 'pending' ORDER BY created_at, id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := []PendingUser{}
	for rows.Next() {
		var u PendingUser
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.CreatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

// NewSetupToken returns a random URL-safe token and the hash to store for it.
func NewSetupToken() (token, hash string, err error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", "", err
	}
	token = base64.RawURLEncoding.EncodeToString(b)
	return token, HashSetupToken(token), nil
}

func HashSetupToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

// ApproveRequest moves a pending user to approved with the given role and a
// fresh setup token. Only the token's hash is stored; the raw token is returned
// so it can be emailed.
func ApproveRequest(id int64, role string) (name, email, token string, err error) {
	if !ValidRole(role) {
		return "", "", "", ErrInvalidRole
	}
	token, hash, err := NewSetupToken()
	if err != nil {
		return "", "", "", err
	}
	expires := time.Now().UTC().Add(SetupTokenTTL).Format(sqliteTime)

	err = DB.QueryRow(
		`UPDATE users SET status = 'approved', role = ?, setup_token_hash = ?, setup_token_expires_at = ?
		 WHERE id = ? AND status = 'pending'
		 RETURNING name, email`,
		role, hash, expires, id,
	).Scan(&name, &email)
	if errors.Is(err, sql.ErrNoRows) {
		return "", "", "", notPendingErr(id)
	}
	if err != nil {
		return "", "", "", err
	}
	return name, email, token, nil
}

// RevertApproval puts a user approved with token back to pending, e.g. when
// the setup email could not be sent.
func RevertApproval(id int64, token string) error {
	_, err := DB.Exec(
		`UPDATE users SET status = 'pending', role = NULL, setup_token_hash = NULL, setup_token_expires_at = NULL
		 WHERE id = ? AND status = 'approved' AND setup_token_hash = ?`,
		id, HashSetupToken(token),
	)
	return err
}

// SetupPassword sets the password of the approved user holding an unexpired
// token and makes them active. The token is cleared in the same update, so it
// works only once even under concurrent use. An unknown, used or expired token
// returns ErrInvalidSetupToken; an invalid password is rejected before the
// token is touched.
func SetupPassword(token, password string) error {
	if err := ValidatePassword(password); err != nil {
		return err
	}
	hash, err := HashPassword(password)
	if err != nil {
		return err
	}
	res, err := DB.Exec(
		`UPDATE users SET password_hash = ?, status = 'active', setup_token_hash = NULL, setup_token_expires_at = NULL
		 WHERE setup_token_hash = ? AND status = 'approved' AND setup_token_expires_at > ?`,
		hash, HashSetupToken(token), time.Now().UTC().Format(sqliteTime),
	)
	if err != nil {
		return err
	}
	if n, err := res.RowsAffected(); err != nil {
		return err
	} else if n == 0 {
		return ErrInvalidSetupToken
	}
	return nil
}

func DenyRequest(id int64) error {
	res, err := DB.Exec(`UPDATE users SET status = 'denied' WHERE id = ? AND status = 'pending'`, id)
	if err != nil {
		return err
	}
	if n, err := res.RowsAffected(); err != nil {
		return err
	} else if n == 0 {
		return notPendingErr(id)
	}
	return nil
}

// notPendingErr explains why an update guarded by status = 'pending' matched nothing.
func notPendingErr(id int64) error {
	var exists int
	err := DB.QueryRow(`SELECT 1 FROM users WHERE id = ?`, id).Scan(&exists)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrUserNotFound
	}
	if err != nil {
		return err
	}
	return ErrNotPending
}
