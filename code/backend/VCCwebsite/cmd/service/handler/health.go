package handler

import (
	"VCCwebsite/internal/auth"
	"net/http"

	"go.mongodb.org/mongo-driver/mongo"
)

func Health(mongoClient *mongo.Client, authMiddleware *auth.AuthMiddleware) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		status := "ok"
		if mongoClient == nil {
			status = "no_db"
		}
		authStatus := "disabled"
		if authMiddleware != nil {
			authStatus = "enabled"
		}
		w.Write([]byte(`{"status":"` + status + `","auth":"` + authStatus + `"}`))
	}
}
