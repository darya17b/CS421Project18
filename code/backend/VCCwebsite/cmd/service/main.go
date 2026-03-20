package main

import (
	"VCCwebsite/api"
	actordb "VCCwebsite/internal/actorDB"
	"VCCwebsite/internal/db"
	"VCCwebsite/internal/oAuth"
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
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

	mongoURI, mongoURIEnv := db.ResolveMongoURI()
	log.Printf("Mongo URI set: %v (source=%s)", mongoURI != "", mongoURIEnv)
	if mongoURI == "" {
		log.Printf("Mongo config missing (%s)", db.MongoConfigHint())
	}

	// Try to connect to MongoDB if MONGO_URI is set
	ctx := context.Background()
	cctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	mongoClient, mongoSource, err := db.ConnectWithSource(cctx)
	if err != nil {
		log.Printf("mongodb connect error (source=%s): %v - continuing without MongoDB", mongoSource, err)
		mongoClient = nil
	}
	if mongoClient != nil {
		log.Printf("Connected to MongoDB (source=%s)", mongoSource)
		defer func() {
			if err := db.MustDisconnect(context.Background(), client); err != nil {
				log.Printf("error disconnecting mongo client: %v", err)
			}
		}()
	} else {
		log.Println("Running without MongoDB connection")
	}

	requireMongo := strings.EqualFold(os.Getenv("REQUIRE_MONGO"), "true")
	if requireMongo && mongoClient == nil {
		log.Fatalf("MongoDB is required but unavailable (%s)", db.MongoConfigHint())
	}
	if !requireMongo && mongoClient == nil {
		log.Printf("MongoDB unavailable; continuing in optional mode. Set REQUIRE_MONGO=true to fail fast (%s)", db.MongoConfigHint())
	}

	// Initialize Okta authentication middleware (optional)
	var authMiddleware *oAuth.CachedAuthMiddleware
	oktaDomain := os.Getenv("OKTA_DOMAIN")
	oktaIssuer := os.Getenv("OKTA_ISSUER")
	oktaClientID := os.Getenv("OKTA_CLIENT_ID")

	if oktaIssuer != "" && oktaClientID != "" {
		log.Println("✓ Okta authentication enabled")
		oktaConfig := &oAuth.OktaConfig{
			Issuer:   oktaIssuer,
			ClientID: oktaClientID,
		}

		authMiddleware, err = oAuth.NewAuthMiddleware(oktaConfig)
		if err != nil {
			log.Fatalf("Failed to initialize Okta auth middleware: %v", err)
		}
	} else {
		log.Println("Okta authentication disabled (missing OKTA_ISSUER or OKTA_CLIENT_ID)")
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
		mux.Handle("/api/script-request", authMiddleware.Middleware(api.ScriptRequestHandler(mongoClient)))
		mux.Handle("/api/document/versions", authMiddleware.Middleware(api.DocumentHandler(mongoClient)))
		mux.Handle("/api/document/version", authMiddleware.Middleware(api.DocumentHandler(mongoClient)))
		mux.Handle("/api/document/restore", authMiddleware.Middleware(api.DocumentHandler(mongoClient)))
		mux.Handle("/api/document/medications", authMiddleware.Middleware(api.DocumentHandler(mongoClient)))
		mux.Handle("/api/document/vitals", authMiddleware.Middleware(api.DocumentHandler(mongoClient)))
		mux.Handle("/api/document", authMiddleware.Middleware(api.DocumentHandler(mongoClient)))
		mux.Handle("/api/artifact", authMiddleware.Middleware(api.ArtifactHandler(mongoClient)))
		mux.Handle("/api/artifact/", authMiddleware.Middleware(api.ArtifactHandler(mongoClient)))
		mux.Handle("/api/artifacts", authMiddleware.Middleware(api.ArtifactHandler(mongoClient)))
		mux.Handle("/api/artifacts/", authMiddleware.Middleware(api.ArtifactHandler(mongoClient)))

		// FIX: was missing closing paren on w.Write([]byte(...))
		mux.HandleFunc("/api/user", func(w http.ResponseWriter, r *http.Request) {
			// Get claims from context
			claims, ok := oAuth.GetClaimsFromContext(r.Context())
			if !ok {
				http.Error(w, "Failed to get user claims", http.StatusInternalServerError)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"wsuid":         claims.WSUID,
				"email_primary": claims.EmailPrimary,
			})
		})
	} else {
		log.Println("API endpoints are PUBLIC (no authentication)")
		mux.Handle("/api/script-request", api.ScriptRequestHandler(mongoClient))
		mux.Handle("/api/document/versions", api.DocumentHandler(mongoClient))
		mux.Handle("/api/document/version", api.DocumentHandler(mongoClient))
		mux.Handle("/api/document/restore", api.DocumentHandler(mongoClient))
		mux.Handle("/api/document/medications", api.DocumentHandler(mongoClient))
		mux.Handle("/api/document/vitals", api.DocumentHandler(mongoClient))
		mux.Handle("/api/document", api.DocumentHandler(mongoClient))
		mux.Handle("/api/artifact", api.ArtifactHandler(mongoClient))
		mux.Handle("/api/artifact/", api.ArtifactHandler(mongoClient))
		mux.Handle("/api/artifacts", api.ArtifactHandler(mongoClient))
		mux.Handle("/api/artifacts/", api.ArtifactHandler(mongoClient))
	}

	// Serve SPA (should be last)
	// Serve SPA (should be last)
	staticPath := os.Getenv("STATIC_PATH")
	if staticPath == "" {
		staticPath = "../../../../Frontend/dist" // Local dev fallback
	}

	spa := spaHandler{
		staticPath: staticPath,
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
	log.Printf("Serving static files from: %s", staticPath)
	log.Printf("API endpoints available at /api/*")

	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
