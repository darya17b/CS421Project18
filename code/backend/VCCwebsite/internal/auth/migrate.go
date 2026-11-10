package auth

import (
	"database/sql"
	"fmt"
)

// migrations[i] moves the schema from version i to i+1 (tracked in PRAGMA user_version).
var migrations = []string{
	// 1: replace the old username-based users table
	`
	DROP TABLE IF EXISTS users;
	CREATE TABLE users (
		id                     INTEGER PRIMARY KEY AUTOINCREMENT,
		name                   TEXT NOT NULL CHECK (trim(name) <> ''),
		email                  TEXT NOT NULL UNIQUE CHECK (trim(email) <> '' AND email = lower(email)),
		password_hash          TEXT,
		role                   TEXT
			CHECK (role IS NULL OR role IN ('requester', 'script viewer', 'script editor', 'admin')),
		status                 TEXT NOT NULL DEFAULT 'pending'
			CHECK (status IN ('pending', 'approved', 'denied', 'active')),
		setup_token_hash       TEXT,
		setup_token_expires_at TEXT,
		created_at             TEXT NOT NULL DEFAULT (datetime('now')),
		CHECK (status NOT IN ('approved', 'active') OR role IS NOT NULL)
	);
	`,
}

// Migrate applies any migrations the database hasn't run yet.
func Migrate(db *sql.DB) error {
	var version int
	if err := db.QueryRow(`PRAGMA user_version`).Scan(&version); err != nil {
		return err
	}

	for i := version; i < len(migrations); i++ {
		tx, err := db.Begin()
		if err != nil {
			return err
		}
		if _, err := tx.Exec(migrations[i]); err != nil {
			tx.Rollback()
			return fmt.Errorf("migration %d: %w", i+1, err)
		}
		if _, err := tx.Exec(fmt.Sprintf(`PRAGMA user_version = %d`, i+1)); err != nil {
			tx.Rollback()
			return err
		}
		if err := tx.Commit(); err != nil {
			return err
		}
	}
	return nil
}
