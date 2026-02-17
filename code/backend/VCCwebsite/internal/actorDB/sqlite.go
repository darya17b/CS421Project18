package actordb

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

const defaultSQLitePath = "actor.db"

// Connect opens a dedicated SQLite connection for the actor database.
func Connect(ctx context.Context, sqlitePath string) (*sql.DB, error) {
	if strings.TrimSpace(sqlitePath) == "" {
		return nil, fmt.Errorf("sqlite path cannot be blank")
	}

	db, err := sql.Open("sqlite", sqlitePath)
	if err != nil {
		return nil, err
	}

	// Keep one open connection to reduce lock contention surprises with SQLite.
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)

	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := db.PingContext(pingCtx); err != nil {
		_ = db.Close()
		return nil, err
	}

	// Basic safety and concurrency pragmas for this standalone DB.
	if _, err := db.ExecContext(ctx, "PRAGMA foreign_keys = ON;"); err != nil {
		_ = db.Close()
		return nil, err
	}
	if _, err := db.ExecContext(ctx, "PRAGMA busy_timeout = 5000;"); err != nil {
		_ = db.Close()
		return nil, err
	}

	return db, nil
}

// ConnectFromEnv opens SQLite using ACTOR_SQLITE_PATH, with a safe default.
func ConnectFromEnv(ctx context.Context) (*sql.DB, error) {
	sqlitePath := os.Getenv("ACTOR_SQLITE_PATH")
	if strings.TrimSpace(sqlitePath) == "" {
		sqlitePath = defaultSQLitePath
	}
	return Connect(ctx, sqlitePath)
}

// Close closes the actor SQLite DB handle.
func Close(db *sql.DB) error {
	if db == nil {
		return nil
	}
	return db.Close()
}
