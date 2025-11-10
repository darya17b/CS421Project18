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

func main() {
	mux := http.NewServeMux()
	mongoURI := os.Getenv("MONGO_URI")
	println(mongoURI)
	// Try to connect to MongoDB if MONGO_URI is set. If not set or connection fails,
	// we continue running the server without a DB client.
	ctx := context.Background()
	// set a global timeout for connect attempts
	cctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	client, err := db.Connect(cctx)
	if err != nil {
		log.Printf("mongodb connect error: %v — continuing without DB", err)
		println("error connection")
		client = nil
	}
	println("made it")
	if client != nil {
		// Ensure we disconnect when main exits
		log.Println("connected to MongoDB")
		println("connected to mongodb")
		defer func() {
			if err := db.MustDisconnect(context.Background(), client); err != nil {
				log.Printf("error disconnecting mongo client: %v", err)
			}
		}()
	}
	/*
		userdbpath := "../../internal/db/UserStore.db"
		userDB, err := sql.open("sqlite", userdbpath)
		if err != nil {
			log.Printf("error opening sql database:%v", err)
			println("sql error")
			userDB = nil
		}*/
	fs := http.FileServer(http.Dir("../../../../Frontend/dist"))
	mux.Handle("/", fs)
	mux.Handle("/api/", api.NewHomePageHandler(client))
	mux.Handle("/api/document", api.DocumentHandler(client))
	//mux.Handle("/api/login",api.LoginHandler(userDB))

    log.Println("starting server on :8080")
    if err := http.ListenAndServe(":8080", mux); err != nil {
        log.Fatalf("server failed: %v", err)
    }
}
