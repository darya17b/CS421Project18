package main

import (
	"VCCwebsite/internal/actordb"
	"context"
	"log"
	"os"
)

func main() {
	ctx := context.Background()

	db, err := actordb.ConnectFromEnv(ctx)
	if err != nil {
		log.Fatalf("actor sqlite connect failed: %v", err)
	}
	defer func() {
		if err := actordb.Close(db); err != nil {
			log.Printf("actor sqlite close failed: %v", err)
		}
	}()

	schemaPath := os.Getenv("ACTOR_SCHEMA_PATH")
	if schemaPath == "" {
		schemaPath = "./internal/db/actor_schema.sql"
	}

	if err := actordb.EnsureSchema(ctx, db, schemaPath); err != nil {
		log.Fatalf("actor schema apply failed: %v", err)
	}

	log.Println("actor sqlite ready")
}

