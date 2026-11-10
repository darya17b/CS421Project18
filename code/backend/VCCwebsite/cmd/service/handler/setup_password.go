package handler

import (
	"VCCwebsite/internal/auth"
	"encoding/json"
	"errors"
	"log"
	"net/http"
)

func SetupPassword() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		var req struct {
			Token    string `json:"token"`
			Password string `json:"password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}

		err := auth.SetupPassword(req.Token, req.Password)
		switch {
		case err == nil:
			w.WriteHeader(http.StatusNoContent)
		case errors.Is(err, auth.ErrPasswordTooShort),
			errors.Is(err, auth.ErrPasswordTooLong),
			errors.Is(err, auth.ErrInvalidSetupToken):
			http.Error(w, err.Error(), http.StatusBadRequest)
		default:
			log.Printf("setup password: %v", err)
			http.Error(w, "internal error", http.StatusInternalServerError)
		}
	}
}
