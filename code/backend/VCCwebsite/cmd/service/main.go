package main

import (
	"VCCwebsite/api"
	"VCCwebsite/internal/db"
	"context"
	"log"
	"net/http"
	"os"
	"time"
)

// CORS middleware to handle cross-origin requests
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get origin from request
		origin := r.Header.Get("Origin")

		// In development, allow requests from common dev ports
		// In production, set ALLOWED_ORIGINS environment variable
		allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
		if allowedOrigins == "" {
			// Default development origins
			allowedOrigins = "http://localhost:3000,http://localhost:5173,http://localhost:5174,http://127.0.0.1:3000,http://127.0.0.1:5173"
		}

		// Check if origin is allowed or use wildcard for development
		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		} else {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}

		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Max-Age", "3600")

		// Handle preflight OPTIONS request
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func main() {
	mux := http.NewServeMux()
	mongoURI := os.Getenv("MONGO_URI")
	log.Printf("MONGO_URI set: %v", mongoURI != "")

	// Try to connect to MongoDB if MONGO_URI is set
	ctx := context.Background()
	cctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	client, err := db.Connect(cctx)
	if err != nil {
		log.Printf("mongodb connect error: %v — continuing without DB", err)
		client = nil
	}

	if client != nil {
		log.Println("✓ Connected to MongoDB")
		defer func() {
			if err := db.MustDisconnect(context.Background(), client); err != nil {
				log.Printf("error disconnecting mongo client: %v", err)
			}
		}()
	} else {
		log.Println("Running without MongoDB connection")
	}

	// API routes (register before static files to take precedence)
	mux.Handle("/api/script-request", api.ScriptRequestHandler(client))
	mux.Handle("/api/document/versions", api.DocumentHandler(client))
	mux.Handle("/api/document/version", api.DocumentHandler(client))
	mux.Handle("/api/document/restore", api.DocumentHandler(client))
	mux.Handle("/api/document/medications", api.DocumentHandler(client))
	mux.Handle("/api/document/vitals", api.DocumentHandler(client))
	mux.Handle("/api/document", api.DocumentHandler(client))
	mux.Handle("/api/artifact", api.ArtifactHandler(client))
	mux.Handle("/api/artifact/", api.ArtifactHandler(client))
	mux.Handle("/api/artifacts", api.ArtifactHandler(client))
	mux.Handle("/api/artifacts/", api.ArtifactHandler(client))

	// Health check endpoint
	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		status := "ok"
		if client == nil {
			status = "no_db"
		}
		w.Write([]byte(`{"status":"` + status + `"}`))
	})

	// Serve static files (should be last)
	fs := http.FileServer(http.Dir("../../../../Frontend/dist"))
	mux.Handle("/", fs)

	// Wrap the mux with CORS middleware
	handler := corsMiddleware(mux)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on :%s", port)
	log.Printf("Serving static files from: ../../../../Frontend/dist")
	log.Printf("API endpoints available at /api/*")

	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
