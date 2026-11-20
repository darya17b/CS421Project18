package handler

import (
	"VCCwebsite/internal/auth"
	"encoding/json"
	"errors"
	"log"
	"net/http"
)

func Login(authMiddleware *auth.AuthMiddleware) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		var req struct {
			Email    string `json:"email"`
			Password string `json:"password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}

		userID, role, err := auth.Authenticate(req.Email, req.Password)
		if errors.Is(err, auth.ErrInvalidCredentials) {
			http.Error(w, auth.ErrInvalidCredentials.Error(), http.StatusUnauthorized)
			return
		}
		if err != nil {
			log.Printf("login: %v", err)
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}

		token, err := authMiddleware.IssueToken(userID, role)
		if err != nil {
			log.Printf("issue token: %v", err)
			http.Error(w, "could not generate token", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"token": token})
	}
}
