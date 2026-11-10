package auth

import (
	"database/sql"
	"errors"
	_ "github.com/mattn/go-sqlite3"
	"log"
	"strings"
)

var DB *sql.DB

func Init(path string) {
	var err error
	DB, err = sql.Open("sqlite3", path)
	if err != nil {
		log.Fatal(err)
	}

	if err := Migrate(DB); err != nil {
		log.Fatal(err)
	}
}

func NormalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

// CreateAdmin inserts an active admin user with a password already set.
func CreateAdmin(name, email, password string) error {
	hash, err := HashPassword(password)
	if err != nil {
		return err
	}
	_, err = DB.Exec(
		`INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, 'admin', 'active')`,
		strings.TrimSpace(name), NormalizeEmail(email), hash,
	)
	return err
}

// CreateAccessRequest inserts a pending user. created is false if the email is already taken.
func CreateAccessRequest(name, email string) (created bool, err error) {
	res, err := DB.Exec(
		`INSERT INTO users (name, email) VALUES (?, ?) ON CONFLICT(email) DO NOTHING`,
		strings.TrimSpace(name), NormalizeEmail(email),
	)
	if err != nil {
		return false, err
	}
	n, err := res.RowsAffected()
	return n == 1, err
}

func ActiveAdminEmails() ([]string, error) {
	rows, err := DB.Query(`SELECT email FROM users WHERE role = 'admin' AND status = 'active'`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var emails []string
	for rows.Next() {
		var e string
		if err := rows.Scan(&e); err != nil {
			return nil, err
		}
		emails = append(emails, e)
	}
	return emails, rows.Err()
}

// ActiveUserRole returns the current role of an active user. A missing or
// non-active user returns ErrUserNotFound.
func ActiveUserRole(id int64) (string, error) {
	var role string
	err := DB.QueryRow(`SELECT role FROM users WHERE id = ? AND status = 'active'`, id).Scan(&role)
	if errors.Is(err, sql.ErrNoRows) {
		return "", ErrUserNotFound
	}
	return role, err
}

var ErrInvalidCredentials = errors.New("invalid email or password")

// Authenticate checks the password of an active user. Any mismatch, unknown
// email or non-active account returns ErrInvalidCredentials.
func Authenticate(email, password string) (userID int64, role string, err error) {
	var hash string
	err = DB.QueryRow(
		`SELECT id, password_hash, role FROM users
		 WHERE email = ? AND status = 'active' AND password_hash IS NOT NULL`,
		NormalizeEmail(email),
	).Scan(&userID, &hash, &role)
	if errors.Is(err, sql.ErrNoRows) {
		CheckPassword(dummyHash(), password)
		return 0, "", ErrInvalidCredentials
	}
	if err != nil {
		return 0, "", err
	}
	if !CheckPassword(hash, password) {
		return 0, "", ErrInvalidCredentials
	}
	return userID, role, nil
}
