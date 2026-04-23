package handler

import (
	"VCCwebsite/internal/auth"
	"encoding/json"
	"net/http"
	"time"

	"golang.org/x/crypto/bcrypt"
)

func Login(authMiddleware *auth.AuthMiddleware, jwtSecret string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		if authMiddleware == nil {
			http.Error(w, "auth not configured", http.StatusNotImplemented)
			return
		}
		var req struct {
			Username string `json:"username"`
			Password string `json:"password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}

		id, hash, role, err := auth.GetUserByUsername(req.Username)
		if err != nil {
			http.Error(w, "invalid credentials", http.StatusUnauthorized)
			return
		}

		if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.Password)); err != nil {
			http.Error(w, "invalid credentials", http.StatusUnauthorized)
			return
		}

		claims := &auth.Claims{
			Subject: req.Username,
			Custom:  map[string]interface{}{"id": id},
		}
		token, err := auth.GenerateToken(jwtSecret, claims, role, 24*time.Hour)
		if err != nil {
			http.Error(w, "could not generate token", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"token": token})
	}
}
