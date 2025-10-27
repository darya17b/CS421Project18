package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"VCCwebsite/api"
	"VCCwebsite/internal/db"
)

func main() {
	mux := http.NewServeMux()

	// Try to connect to MongoDB if MONGO_URI is set. If not set or connection fails,
	// we continue running the server without a DB client.
	ctx := context.Background()
	// set a global timeout for connect attempts
	cctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	client, err := db.Connect(cctx)
	if err != nil {
		log.Printf("mongodb connect error: %v — continuing without DB", err)
		client = nil
	}
	if client != nil {
		// Ensure we disconnect when main exits
		log.Println("connected to MongoDB")
		defer func() {
			if err := db.MustDisconnect(context.Background(), client); err != nil {
				log.Printf("error disconnecting mongo client: %v", err)
			}
		}()
	}

	mux.Handle("/", api.NewHomePageHandler(client))

	log.Println("starting server on :8080")
	if err := http.ListenAndServe(":8080", mux); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
