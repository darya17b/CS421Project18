package main

import (
	"VCCwebsite/api"
	"VCCwebsite/internal/db"
	"VCCwebsite/internal/oAuth"
	"context"
	"log"
	"net/http"
	"os"
	"path/filepath"
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

// spaHandler implements the http.Handler interface for serving SPAs
type spaHandler struct {
	staticPath string
	indexPath  string
}

// ServeHTTP inspects the URL path to locate a file within the static dir
// If a file is found, it will be served. If not, the index.html file will be served
func (h spaHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Get the absolute path to prevent directory traversal
	path := filepath.Join(h.staticPath, r.URL.Path)

	// Check whether a file exists at the given path
	fi, err := os.Stat(path)
	if os.IsNotExist(err) || fi.IsDir() {
		// File does not exist or is a directory, serve index.html
		http.ServeFile(w, r, filepath.Join(h.staticPath, h.indexPath))
		return
	}

	if err != nil {
		// If there was an error (other than not exist), return 500
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Otherwise, serve the file
	http.FileServer(http.Dir(h.staticPath)).ServeHTTP(w, r)
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
		log.Println("Connected to MongoDB")
		defer func() {
			if err := db.MustDisconnect(context.Background(), client); err != nil {
				log.Printf("error disconnecting mongo client: %v", err)
			}
		}()
	} else {
		log.Println("Running without MongoDB connection")
	}

	// Initialize Okta authentication middleware (optional - controlled by env vars)
	var authMiddleware *oAuth.CachedAuthMiddleware
	oktaDomain := os.Getenv("OKTA_DOMAIN")
	oktaIssuer := os.Getenv("OKTA_ISSUER")
	oktaAudience := os.Getenv("OKTA_AUDIENCE")

	if oktaDomain != "" && oktaIssuer != "" && oktaAudience != "" {
		log.Println("Okta authentication enabled")
		oktaConfig := &oAuth.OktaConfig{
			Domain:   oktaDomain,
			Issuer:   oktaIssuer,
			Audience: oktaAudience,
		}
		// Use cached middleware for better performance (1 hour cache)
		authMiddleware = oAuth.NewCachedAuthMiddleware(oktaConfig, 1*time.Hour)
	} else {
		log.Println("Okta authentication disabled (missing OKTA_DOMAIN, OKTA_ISSUER, or OKTA_AUDIENCE)")
	}

	// Health check endpoint (public - no auth required)
	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		status := "ok"
		if client == nil {
			status = "no_db"
		}
		authStatus := "disabled"
		if authMiddleware != nil {
			authStatus = "enabled"
		}
		w.Write([]byte(`{"status":"` + status + `","auth":"` + authStatus + `"}`))
	})

	// API routes - wrap with auth middleware if enabled
	if authMiddleware != nil {
		// Protected routes (authentication required)
		log.Println("Applying authentication to API endpoints")
		mux.Handle("/api/script-request", authMiddleware.Middleware(api.ScriptRequestHandler(client)))
		mux.Handle("/api/document/versions", authMiddleware.Middleware(api.DocumentHandler(client)))
		mux.Handle("/api/document/version", authMiddleware.Middleware(api.DocumentHandler(client)))
		mux.Handle("/api/document/restore", authMiddleware.Middleware(api.DocumentHandler(client)))
		mux.Handle("/api/document/medications", authMiddleware.Middleware(api.DocumentHandler(client)))
		mux.Handle("/api/document/vitals", authMiddleware.Middleware(api.DocumentHandler(client)))
		mux.Handle("/api/document", authMiddleware.Middleware(api.DocumentHandler(client)))

		// Optional: Add endpoint to get current user info
		mux.HandleFunc("/api/user", func(w http.ResponseWriter, r *http.Request) {
			// Get claims from context
			claims, ok := oAuth.GetClaimsFromContext(r.Context())
			if !ok {
				http.Error(w, "Failed to get user claims", http.StatusInternalServerError)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			w.Write([]byte(`{"user_id":"` + claims.Subject + `","email":"` + claims.Email + `","name":"` + claims.Name + `"}`))
		})
	} else {
		// No authentication - routes are public
		log.Println("API endpoints are PUBLIC (no authentication)")
		mux.Handle("/api/script-request", api.ScriptRequestHandler(client))
		mux.Handle("/api/document/versions", api.DocumentHandler(client))
		mux.Handle("/api/document/version", api.DocumentHandler(client))
		mux.Handle("/api/document/restore", api.DocumentHandler(client))
		mux.Handle("/api/document/medications", api.DocumentHandler(client))
		mux.Handle("/api/document/vitals", api.DocumentHandler(client))
		mux.Handle("/api/document", api.DocumentHandler(client))
	}

	// Serve SPA (should be last)
	spa := spaHandler{
		staticPath: "../../../../Frontend/dist",
		indexPath:  "index.html",
	}
	mux.Handle("/", spa)

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
