package handler

import (
	"VCCwebsite/internal/auth"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/mail"
	"strings"
)

// AccessRequests responds the same way whether or not the email is already registered.
func AccessRequests(mailer auth.Mailer) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		var req struct {
			Name  string `json:"name"`
			Email string `json:"email"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}

		name := strings.TrimSpace(req.Name)
		email := auth.NormalizeEmail(req.Email)
		if name == "" {
			http.Error(w, "name is required", http.StatusBadRequest)
			return
		}
		if addr, err := mail.ParseAddress(email); err != nil || addr.Address != email {
			http.Error(w, "valid email is required", http.StatusBadRequest)
			return
		}

		created, err := auth.CreateAccessRequest(name, email)
		if err != nil {
			log.Printf("create access request: %v", err)
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}
		if created {
			notifyAdmins(mailer, name, email)
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusAccepted)
		json.NewEncoder(w).Encode(map[string]string{"message": "request received"})
	}
}

func notifyAdmins(mailer auth.Mailer, name, email string) {
	admins, err := auth.ActiveAdminEmails()
	if err != nil {
		log.Printf("look up admins: %v", err)
		return
	}
	body := fmt.Sprintf("%s <%s> has requested access.", name, email)
	for _, to := range admins {
		if err := mailer.Send(to, "New access request", body); err != nil {
			log.Printf("notify admin %s: %v", to, err)
		}
	}
}
