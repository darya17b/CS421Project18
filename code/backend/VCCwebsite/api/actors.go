package api

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// ─── Model ────────────────────────────────────────────────────────────────────

type Actor struct {
	ID                  int64   `json:"id"`
	Name                string  `json:"name"`
	Email               string  `json:"email"`
	Notes               *string `json:"notes,omitempty"`
	PhoneNumber         string  `json:"phone_number"`
	AgeRange            *string `json:"age_range,omitempty"`
	Pronouns            *string `json:"pronouns,omitempty"`
	EmployeeID          string  `json:"employee_id"`
	WorkdayName         string  `json:"workday_name"`
	TimeCode            string  `json:"time_code"`
	LeadTimeCode        *string `json:"lead_time_code,omitempty"`
	SpecializedTimeCode *string `json:"specialized_time_code,omitempty"`
	CreatedAt           string  `json:"created_at"`
	UpdatedAt           string  `json:"updated_at"`
}

type ActorHandler struct {
	db *sql.DB
}

// ActorsHandler returns an http.Handler that routes /api/actors and /api/actors/{id}.
// Plug it into your mux like your existing API handlers:
//
//	api.ActorsHandler(actorDB)
func ActorsHandler(db *sql.DB) http.Handler {
	h := &ActorHandler{db: db}
	mux := http.NewServeMux()
	mux.HandleFunc("/api/actors/", h.handleByID)
	mux.HandleFunc("/api/actors", h.handleCollection)
	return mux
}

func (h *ActorHandler) handleCollection(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.listActors(w, r)
	case http.MethodPost:
		h.createActor(w, r)
	default:
		actorWriteError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (h *ActorHandler) handleByID(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.getActor(w, r)
	case http.MethodPut, http.MethodPatch:
		h.updateActor(w, r)
	case http.MethodDelete:
		h.deleteActor(w, r)
	default:
		actorWriteError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// get
// Supports optional query parameters (all ANDed together):
//   ?name=alice        → case-insensitive partial match on name
//   ?pronouns=she/her  → exact match on pronouns
//   ?age_range=20s     → exact match on age_range

func (h *ActorHandler) listActors(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	name := strings.TrimSpace(q.Get("name"))
	pronouns := strings.TrimSpace(q.Get("pronouns"))
	ageRange := strings.TrimSpace(q.Get("age_range"))

	query := `
		SELECT id, name, email, notes, phone_number, age_range, pronouns,
		       employee_id, workday_name, time_code, lead_time_code,
		       specialized_time_code, created_at, updated_at
		FROM actors`

	var conditions []string
	var args []any

	if name != "" {
		conditions = append(conditions, "name LIKE ? COLLATE NOCASE")
		args = append(args, "%"+name+"%")
	}
	if pronouns != "" {
		conditions = append(conditions, "pronouns = ? COLLATE NOCASE")
		args = append(args, pronouns)
	}
	if ageRange != "" {
		conditions = append(conditions, "age_range = ? COLLATE NOCASE")
		args = append(args, ageRange)
	}

	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}
	query += " ORDER BY name"

	rows, err := h.db.QueryContext(r.Context(), query, args...)
	if err != nil {
		actorInternalError(w, err)
		return
	}
	defer rows.Close()

	actors := []Actor{}
	for rows.Next() {
		var a Actor
		if err := scanActor(rows, &a); err != nil {
			actorInternalError(w, err)
			return
		}
		actors = append(actors, a)
	}
	if err := rows.Err(); err != nil {
		actorInternalError(w, err)
		return
	}

	actorWriteJSON(w, http.StatusOK, actors)
}

// get
func (h *ActorHandler) getActor(w http.ResponseWriter, r *http.Request) {
	id, ok := parseActorID(w, r)
	if !ok {
		return
	}

	var a Actor
	row := h.db.QueryRowContext(r.Context(), `
		SELECT id, name, email, notes, phone_number, age_range, pronouns,
		       employee_id, workday_name, time_code, lead_time_code,
		       specialized_time_code, created_at, updated_at
		FROM actors WHERE id = ?`, id)

	if err := scanActor(row, &a); err == sql.ErrNoRows {
		actorWriteError(w, http.StatusNotFound, "actor not found")
		return
	} else if err != nil {
		actorInternalError(w, err)
		return
	}

	actorWriteJSON(w, http.StatusOK, a)
}

// post
func (h *ActorHandler) createActor(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Name                string  `json:"name"`
		Email               string  `json:"email"`
		Notes               *string `json:"notes"`
		PhoneNumber         string  `json:"phone_number"`
		AgeRange            *string `json:"age_range"`
		Pronouns            *string `json:"pronouns"`
		EmployeeID          string  `json:"employee_id"`
		WorkdayName         string  `json:"workday_name"`
		TimeCode            string  `json:"time_code"`
		LeadTimeCode        *string `json:"lead_time_code"`
		SpecializedTimeCode *string `json:"specialized_time_code"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		actorWriteError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	missing := []string{}
	if strings.TrimSpace(input.Name) == "" {
		missing = append(missing, "name")
	}
	if strings.TrimSpace(input.Email) == "" {
		missing = append(missing, "email")
	}
	if strings.TrimSpace(input.PhoneNumber) == "" {
		missing = append(missing, "phone_number")
	}
	if strings.TrimSpace(input.EmployeeID) == "" {
		missing = append(missing, "employee_id")
	}
	if strings.TrimSpace(input.WorkdayName) == "" {
		missing = append(missing, "workday_name")
	}
	if strings.TrimSpace(input.TimeCode) == "" {
		missing = append(missing, "time_code")
	}
	if len(missing) > 0 {
		actorWriteError(w, http.StatusBadRequest, "missing required fields: "+strings.Join(missing, ", "))
		return
	}

	res, err := h.db.ExecContext(r.Context(), `
		INSERT INTO actors
		    (name, email, notes, phone_number, age_range, pronouns,
		     employee_id, workday_name, time_code, lead_time_code, specialized_time_code)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		input.Name, input.Email, input.Notes, input.PhoneNumber,
		input.AgeRange, input.Pronouns, input.EmployeeID, input.WorkdayName,
		input.TimeCode, input.LeadTimeCode, input.SpecializedTimeCode,
	)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE") {
			actorWriteError(w, http.StatusConflict, "email or employee_id already exists")
			return
		}
		if strings.Contains(err.Error(), "CHECK") {
			actorWriteError(w, http.StatusBadRequest, "field failed a constraint check: "+err.Error())
			return
		}
		actorInternalError(w, err)
		return
	}

	id, _ := res.LastInsertId()
	actorWriteJSON(w, http.StatusCreated, map[string]int64{"id": id})
}

// put
func (h *ActorHandler) updateActor(w http.ResponseWriter, r *http.Request) {
	id, ok := parseActorID(w, r)
	if !ok {
		return
	}

	var input struct {
		Name                *string `json:"name"`
		Email               *string `json:"email"`
		Notes               *string `json:"notes"`
		PhoneNumber         *string `json:"phone_number"`
		AgeRange            *string `json:"age_range"`
		Pronouns            *string `json:"pronouns"`
		EmployeeID          *string `json:"employee_id"`
		WorkdayName         *string `json:"workday_name"`
		TimeCode            *string `json:"time_code"`
		LeadTimeCode        *string `json:"lead_time_code"`
		SpecializedTimeCode *string `json:"specialized_time_code"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		actorWriteError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	setClauses := []string{"updated_at = ?"}
	args := []any{time.Now().UTC().Format("2006-01-02 15:04:05")}

	if input.Name != nil {
		setClauses = append(setClauses, "name = ?")
		args = append(args, *input.Name)
	}
	if input.Email != nil {
		setClauses = append(setClauses, "email = ?")
		args = append(args, *input.Email)
	}
	if input.Notes != nil {
		setClauses = append(setClauses, "notes = ?")
		args = append(args, *input.Notes)
	}
	if input.PhoneNumber != nil {
		setClauses = append(setClauses, "phone_number = ?")
		args = append(args, *input.PhoneNumber)
	}
	if input.AgeRange != nil {
		setClauses = append(setClauses, "age_range = ?")
		args = append(args, *input.AgeRange)
	}
	if input.Pronouns != nil {
		setClauses = append(setClauses, "pronouns = ?")
		args = append(args, *input.Pronouns)
	}
	if input.EmployeeID != nil {
		setClauses = append(setClauses, "employee_id = ?")
		args = append(args, *input.EmployeeID)
	}
	if input.WorkdayName != nil {
		setClauses = append(setClauses, "workday_name = ?")
		args = append(args, *input.WorkdayName)
	}
	if input.TimeCode != nil {
		setClauses = append(setClauses, "time_code = ?")
		args = append(args, *input.TimeCode)
	}
	if input.LeadTimeCode != nil {
		setClauses = append(setClauses, "lead_time_code = ?")
		args = append(args, *input.LeadTimeCode)
	}
	if input.SpecializedTimeCode != nil {
		setClauses = append(setClauses, "specialized_time_code = ?")
		args = append(args, *input.SpecializedTimeCode)
	}

	if len(setClauses) == 1 {
		actorWriteError(w, http.StatusBadRequest, "no fields provided to update")
		return
	}

	args = append(args, id)
	query := "UPDATE actors SET " + strings.Join(setClauses, ", ") + " WHERE id = ?"

	res, err := h.db.ExecContext(r.Context(), query, args...)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE") {
			actorWriteError(w, http.StatusConflict, "email or employee_id already exists")
			return
		}
		if strings.Contains(err.Error(), "CHECK") {
			actorWriteError(w, http.StatusBadRequest, "field failed a constraint check: "+err.Error())
			return
		}
		actorInternalError(w, err)
		return
	}

	if n, _ := res.RowsAffected(); n == 0 {
		actorWriteError(w, http.StatusNotFound, "actor not found")
		return
	}

	actorWriteJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

// delete function
func (h *ActorHandler) deleteActor(w http.ResponseWriter, r *http.Request) {
	id, ok := parseActorID(w, r)
	if !ok {
		return
	}

	res, err := h.db.ExecContext(r.Context(), `DELETE FROM actors WHERE id = ?`, id)
	if err != nil {
		actorInternalError(w, err)
		return
	}

	if n, _ := res.RowsAffected(); n == 0 {
		actorWriteError(w, http.StatusNotFound, "actor not found")
		return
	}

	actorWriteJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// helper fucntions
type actorScanner interface {
	Scan(dest ...any) error
}

func scanActor(s actorScanner, a *Actor) error {
	return s.Scan(
		&a.ID, &a.Name, &a.Email, &a.Notes, &a.PhoneNumber,
		&a.AgeRange, &a.Pronouns, &a.EmployeeID, &a.WorkdayName,
		&a.TimeCode, &a.LeadTimeCode, &a.SpecializedTimeCode,
		&a.CreatedAt, &a.UpdatedAt,
	)
}

func parseActorID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	segment := strings.TrimPrefix(r.URL.Path, "/api/actors/")
	id, err := strconv.ParseInt(segment, 10, 64)
	if err != nil || id <= 0 {
		actorWriteError(w, http.StatusBadRequest, "invalid actor id")
		return 0, false
	}
	return id, true
}

func actorWriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("actorWriteJSON encode error: %v", err)
	}
}

func actorWriteError(w http.ResponseWriter, status int, msg string) {
	actorWriteJSON(w, status, map[string]string{"error": msg})
}

func actorInternalError(w http.ResponseWriter, err error) {
	log.Printf("actor handler error: %v", err)
	actorWriteError(w, http.StatusInternalServerError, "internal server error")
}
