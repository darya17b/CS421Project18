package actordb

import (
	"context"
	"database/sql"
	"fmt"
	"os"
)

// EnsureSchema executes the SQL schema file against the actor SQLite database.
func EnsureSchema(ctx context.Context, db *sql.DB, schemaPath string) error {
	if db == nil {
		return fmt.Errorf("sqlite db is nil")
	}
	if schemaPath == "" {
		return fmt.Errorf("schema path cannot be blank")
	}

	sqlBytes, err := os.ReadFile(schemaPath)
	if err != nil {
		return err
	}

	_, err = db.ExecContext(ctx, string(sqlBytes))
	return err
}

