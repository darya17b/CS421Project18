package api

import (
	"context"
	"encoding/json"
	"net/http"

	"go.mongodb.org/mongo-driver/mongo"
)

type HomePageHandler struct {
	client *mongo.Client
}

func NewHomePageHandler(client *mongo.Client) *HomePageHandler {
	return &HomePageHandler{client: client}
}

func (h *HomePageHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Simple status response. If DB is connected we show DB info, otherwise just a message.
	w.Header().Set("Content-Type", "application/json")
	resp := make(map[string]interface{})
	if h.client == nil {
		resp["status"] = "ok"
		resp["db"] = "not connected"
	} else {
		// attempt a quick list of database names as a health indicator
		ctx := context.Background()
		names, err := h.client.ListDatabaseNames(ctx, map[string]interface{}{})
		if err != nil {
			resp["status"] = "ok"
			resp["db"] = "connected"
			resp["db_error"] = err.Error()
		} else {
			resp["status"] = "ok"
			resp["db"] = "connected"
			resp["databases"] = names
		}
	}
	_ = json.NewEncoder(w).Encode(resp)
}
