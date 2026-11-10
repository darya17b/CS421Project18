package handler

import (
	"net/http"

	"go.mongodb.org/mongo-driver/mongo"
)

func Health(mongoClient *mongo.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		status := "ok"
		if mongoClient == nil {
			status = "no_db"
		}
		w.Write([]byte(`{"status":"` + status + `"}`))
	}
}
