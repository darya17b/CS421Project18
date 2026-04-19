package handler

import (
	"VCCwebsite/internal/auth"
	"encoding/json"
	"net/http"
)

func User() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, ok := auth.GetClaimsFromContext(r.Context())
		if !ok {
			http.Error(w, "failed to get user claims", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"subject": claims.Subject,
			"role":    claims.Custom["role"],
		})
	}
}
