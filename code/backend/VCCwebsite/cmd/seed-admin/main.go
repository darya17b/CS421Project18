package main

import (
	"VCCwebsite/internal/auth"
	"log"
	"os"
)

func main() {
	dbPath := os.Getenv("AUTH_DB_PATH")
	if dbPath == "" {
		dbPath = "auth.db"
	}

	name := os.Getenv("ADMIN_NAME")
	email := os.Getenv("ADMIN_EMAIL")
	password := os.Getenv("ADMIN_PASSWORD")
	if name == "" || email == "" || password == "" {
		log.Fatal("set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD")
	}

	auth.Init(dbPath)
	defer auth.DB.Close()

	if err := auth.CreateAdmin(name, email, password); err != nil {
		log.Fatalf("seed admin failed: %v", err)
	}
	log.Printf("admin %s created in %s", auth.NormalizeEmail(email), dbPath)
}
