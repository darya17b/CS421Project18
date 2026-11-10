package handler

import (
	"VCCwebsite/internal/auth"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
)

// RegisterAdminRoutes adds the access-request admin endpoints, each behind the
// auth middleware and RequireAdmin. appURL is the base of the emailed setup link.
func RegisterAdminRoutes(mux *http.ServeMux, am *auth.AuthMiddleware, mailer auth.Mailer, appURL string) {
	admin := func(h http.HandlerFunc) http.Handler { return am.Middleware(auth.RequireAdmin(h)) }
	mux.Handle("GET /api/admin/requests", admin(listRequests()))
	mux.Handle("POST /api/admin/requests/{id}/approve", admin(approveRequest(mailer, appURL)))
	mux.Handle("POST /api/admin/requests/{id}/deny", admin(denyRequest()))
}

func listRequests() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		users, err := auth.PendingUsers()
		if err != nil {
			log.Printf("list pending users: %v", err)
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(users)
	}
}

func approveRequest(mailer auth.Mailer, appURL string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, ok := pathID(w, r)
		if !ok {
			return
		}
		var req struct {
			Role string `json:"role"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}
		if !auth.ValidRole(req.Role) {
			http.Error(w, "invalid role", http.StatusBadRequest)
			return
		}

		name, email, token, err := auth.ApproveRequest(id, req.Role)
		if writeRequestErr(w, err) {
			return
		}

		link := strings.TrimRight(appURL, "/") + "/set-password?token=" + url.QueryEscape(token)
		body := fmt.Sprintf("Hi %s,\n\nYour access request was approved. Set your password within 48 hours:\n%s", name, link)
		if err := mailer.Send(email, "Set your password", body); err != nil {
			log.Printf("send setup email to %s: %v", email, err)
			if err := auth.RevertApproval(id, token); err != nil {
				log.Printf("revert approval of user %d: %v", id, err)
			}
			http.Error(w, "could not send setup email; request is still pending", http.StatusBadGateway)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

func denyRequest() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, ok := pathID(w, r)
		if !ok {
			return
		}
		if writeRequestErr(w, auth.DenyRequest(id)) {
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

func pathID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return 0, false
	}
	return id, true
}

// writeRequestErr writes the response for a failed approve/deny and reports whether it did.
func writeRequestErr(w http.ResponseWriter, err error) bool {
	switch {
	case err == nil:
		return false
	case errors.Is(err, auth.ErrUserNotFound):
		http.Error(w, "request not found", http.StatusNotFound)
	case errors.Is(err, auth.ErrNotPending):
		http.Error(w, "request is not pending", http.StatusConflict)
	default:
		log.Printf("update request: %v", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
	}
	return true
}
