package main

import (
	"VCCwebsite/api"
	"VCCwebsite/cmd/service/handler"
	"VCCwebsite/cmd/service/middleware"
	"VCCwebsite/internal/auth"
	"VCCwebsite/internal/db"
	"context"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

func main() {
	mux := http.NewServeMux()

	dbPath := os.Getenv("AUTH_DB_PATH")
	if dbPath == "" {
		dbPath = "auth.db"
	}
	auth.Init(dbPath)
	log.Printf("Auth DB initialized at %s", dbPath)

	mongoURI, mongoURIEnv := db.ResolveMongoURI()
	log.Printf("Mongo URI set: %v (source=%s)", mongoURI != "", mongoURIEnv)
	if mongoURI == "" {
		log.Printf("Mongo config missing (%s)", db.MongoConfigHint())
	}

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
			if err := db.MustDisconnect(context.Background(), mongoClient); err != nil {
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

	var authMiddleware *auth.AuthMiddleware
	jwtSecret := os.Getenv("JWT_SECRET")

	if jwtSecret != "" {
		log.Println("✓ JWT authentication enabled")
		authMiddleware, err = auth.NewAuthMiddleware(jwtSecret)
		if err != nil {
			log.Fatalf("Failed to initialize auth middleware: %v", err)
		}
	} else {
		log.Println("JWT authentication disabled (set JWT_SECRET to enable)")
	}

	protect := func(h http.Handler) http.Handler {
		if authMiddleware != nil {
			return authMiddleware.Middleware(h)
		}
		return h
	}

	mux.HandleFunc("/api/login", handler.Login(authMiddleware, jwtSecret))
	mux.HandleFunc("/api/health", handler.Health(mongoClient, authMiddleware))

	mux.Handle("/api/script-request", protect(api.ScriptRequestHandler(mongoClient)))
	mux.Handle("/api/document/versions", protect(api.DocumentHandler(mongoClient)))
	mux.Handle("/api/document/version", protect(api.DocumentHandler(mongoClient)))
	mux.Handle("/api/document/restore", protect(api.DocumentHandler(mongoClient)))
	mux.Handle("/api/document/medications", protect(api.DocumentHandler(mongoClient)))
	mux.Handle("/api/document/vitals", protect(api.DocumentHandler(mongoClient)))
	mux.Handle("/api/document", protect(api.DocumentHandler(mongoClient)))
	mux.Handle("/api/artifact", protect(api.ArtifactHandler(mongoClient)))
	mux.Handle("/api/artifact/", protect(api.ArtifactHandler(mongoClient)))
	mux.Handle("/api/artifacts", protect(api.ArtifactHandler(mongoClient)))
	mux.Handle("/api/artifacts/", protect(api.ArtifactHandler(mongoClient)))
	mux.Handle("/api/user", protect(handler.User()))

	staticPath := os.Getenv("STATIC_PATH")
	if staticPath == "" {
		staticPath = "../../../../Frontend/dist"
	}
	mux.Handle("/", handler.SPAHandler{StaticPath: staticPath, IndexPath: "index.html"})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on :%s", port)
	log.Printf("Serving static files from: %s", staticPath)
	log.Printf("API endpoints available at /api/*")

	if err := http.ListenAndServe(":"+port, middleware.CORS(mux)); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
