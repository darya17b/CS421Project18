package auth

import (
	"database/sql"
	_ "github.com/mattn/go-sqlite3"
	"golang.org/x/crypto/bcrypt"
	"log"
)

var DB *sql.DB

func Init(path string) {
	var err error
	DB, err = sql.Open("sqlite3", path)
	if err != nil {
		log.Fatal(err)
	}

	_, err = DB.Exec(`
        CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            username      TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role          TEXT NOT NULL DEFAULT 'user'
        )
    `)
	if err != nil {
		log.Fatal(err)
	}
}

func CreateUser(username, password, role string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	_, err = DB.Exec(
		`INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)`,
		username, string(hash), role,
	)
	return err
}

func GetUserByUsername(username string) (int64, string, string, error) {
	var id int64
	var hash, role string
	err := DB.QueryRow(
		`SELECT id, password_hash, role FROM users WHERE username = ?`, username,
	).Scan(&id, &hash, &role)
	return id, hash, role, err
}
