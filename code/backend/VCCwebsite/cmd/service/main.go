package main

import (
	"VCCwebsite/api"
	"VCCwebsite/internal/actorDB"
	"VCCwebsite/internal/db"
	"VCCwebsite/internal/oAuth"
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

// CORS middleware to handle cross-origin requests
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")

		allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
		if allowedOrigins == "" {
			allowedOrigins = "http://localhost:3000,http://localhost:5173,http://localhost:5174,http://127.0.0.1:3000,http://127.0.0.1:5173"
		}

		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		} else {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Max-Age", "3600")

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

func (h spaHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := filepath.Join(h.staticPath, r.URL.Path)
	fi, err := os.Stat(path)
	if os.IsNotExist(err) || fi.IsDir() {
		http.ServeFile(w, r, filepath.Join(h.staticPath, h.indexPath))
		return
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	http.FileServer(http.Dir(h.staticPath)).ServeHTTP(w, r)
}

func main() {
	ctx := context.Background()

	// Connect to SQLite (actor database)
	actorDB, err := actordb.ConnectFromEnv(ctx)
	if err != nil {
		log.Fatalf("actor sqlite connect failed: %v", err)
	}
	defer func() {
		if err := actordb.Close(actorDB); err != nil {
			log.Printf("actor sqlite close failed: %v", err)
		}
	}()

	// Ensure SQLite schema is applied
	schemaPath := os.Getenv("ACTOR_SCHEMA_PATH")
	if schemaPath == "" {
		schemaPath = "./internal/actorDB/actor_schema.sql"
	}
	if err := actordb.EnsureSchema(ctx, actorDB, schemaPath); err != nil {
		log.Fatalf("actor schema apply failed: %v", err)
	}
	log.Println("Actor SQLite database ready")

	// Setup HTTP server
	mux := http.NewServeMux()

	mongoURI := os.Getenv("MONGO_URI")
	log.Printf("MONGO_URI set: %v", mongoURI != "")

	cctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	mongoClient, err := db.Connect(cctx)
	if err != nil {
		log.Printf("mongodb connect error: %v — continuing without MongoDB", err)
		mongoClient = nil
	}
	if mongoClient != nil {
		log.Println("Connected to MongoDB")
		defer func() {
			if err := db.MustDisconnect(context.Background(), mongoClient); err != nil {
				log.Printf("error disconnecting mongo client: %v", err)
			}
		}()
	} else {
		log.Println("Running without MongoDB connection")
	}

	// Initialize Okta authentication middleware (optional)
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
		authMiddleware = oAuth.NewCachedAuthMiddleware(oktaConfig, 1*time.Hour)
	} else {
		log.Println("Okta authentication disabled (missing OKTA_DOMAIN, OKTA_ISSUER, or OKTA_AUDIENCE)")
	}

	// ── Health check (public) ──────────────────────────────────────────────────
	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		status := "ok"
		if mongoClient == nil {
			status = "no_mongo"
		}
		authStatus := "disabled"
		if authMiddleware != nil {
			authStatus = "enabled"
		}
		w.Header().Set("Content-Type", "application/json")
		// FIX: was missing closing paren on w.Write([]byte(...))
		fmt.Fprintf(w, `{"status":%q,"auth":%q,"sqlite":"ready"}`, status, authStatus)
	})

	// ── Actor routes ──────────────────────────────────────────────────────────
	// Actor routes are public — wrap with authMiddleware below if you want them protected.
	mux.Handle("/api/actors/", api.ActorsHandler(actorDB))
	mux.Handle("/api/actors", api.ActorsHandler(actorDB))

	// ── Mongo-backed API routes ───────────────────────────────────────────────
	if authMiddleware != nil {
		log.Println("Applying authentication to API endpoints")
		mux.Handle("/api/script-request", authMiddleware.Middleware(api.ScriptRequestHandler(mongoClient)))
		mux.Handle("/api/document/versions", authMiddleware.Middleware(api.DocumentHandler(mongoClient)))
		mux.Handle("/api/document/version", authMiddleware.Middleware(api.DocumentHandler(mongoClient)))
		mux.Handle("/api/document/restore", authMiddleware.Middleware(api.DocumentHandler(mongoClient)))
		mux.Handle("/api/document/medications", authMiddleware.Middleware(api.DocumentHandler(mongoClient)))
		mux.Handle("/api/document/vitals", authMiddleware.Middleware(api.DocumentHandler(mongoClient)))
		mux.Handle("/api/document", authMiddleware.Middleware(api.DocumentHandler(mongoClient)))

		// FIX: was missing closing paren on w.Write([]byte(...))
		mux.HandleFunc("/api/user", func(w http.ResponseWriter, r *http.Request) {
			claims, ok := oAuth.GetClaimsFromContext(r.Context())
			if !ok {
				http.Error(w, "Failed to get user claims", http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			fmt.Fprintf(w, `{"user_id":%q,"email":%q,"name":%q}`, claims.Subject, claims.Email, claims.Name)
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
	}

	// ── SPA (must be last) ────────────────────────────────────────────────────
	spa := spaHandler{
		staticPath: "../../../../Frontend/dist",
		indexPath:  "index.html",
	}
	mux.Handle("/", spa)

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
