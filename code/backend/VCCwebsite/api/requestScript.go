// api/script_request.go
package api

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"VCCwebsite/internal/model"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// ScriptRequestWithID wraps ScriptRequest with MongoDB ID
type ScriptRequestWithID struct {
	ID string `json:"id"`
	scripts.ScriptRequest
}

// ScriptRequestHandler handles all script request-related REST API endpoints
func ScriptRequestHandler(client *mongo.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		if client == nil {
			respondWithError(w, http.StatusServiceUnavailable, "Database connection not available")
			return
		}

		collection := client.Database("vccwebsite").Collection("script_requests")

		switch r.Method {
		case http.MethodGet:
			handleGetScriptRequests(w, r, collection)
		case http.MethodPost:
			handleCreateScriptRequest(w, r, collection)
		case http.MethodPut:
			handleUpdateScriptRequest(w, r, collection)
		case http.MethodDelete:
			handleDeleteScriptRequest(w, r, collection)
		default:
			respondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		}
	}
}

// handleGetScriptRequests retrieves script requests
// GET /api/script-request - get all script requests
// GET /api/script-request?id=xxx - get specific script request by ID
// GET /api/script-request?diagnosis=xxx - search by diagnosis
// GET /api/script-request?chief_concern=xxx - search by chief concern
// GET /api/script-request?learner_level=xxx - search by learner level
func handleGetScriptRequests(w http.ResponseWriter, r *http.Request, collection *mongo.Collection) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Check if requesting a specific script request by ID
	reqID := r.URL.Query().Get("id")
	if reqID != "" {
		objectID, err := primitive.ObjectIDFromHex(reqID)
		if err != nil {
			respondWithError(w, http.StatusBadRequest, "Invalid script request ID format")
			return
		}

		var rawDoc bson.M
		err = collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&rawDoc)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				respondWithError(w, http.StatusNotFound, "Script request not found")
				return
			}
			respondWithError(w, http.StatusInternalServerError, "Error retrieving script request")
			return
		}

		// Convert to ScriptRequestWithID
		req := convertToScriptRequestWithID(rawDoc)
		respondWithJSON(w, http.StatusOK, req)
		return
	}

	// Build filter based on query parameters
	filter := buildScriptRequestFilterFromQuery(r)

	// Get script requests with filter
	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error retrieving script requests")
		return
	}
	defer cursor.Close(ctx)

	var rawDocs []bson.M
	if err = cursor.All(ctx, &rawDocs); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error decoding script requests")
		return
	}

	// Convert to ScriptRequestWithID slice
	requests := make([]ScriptRequestWithID, 0, len(rawDocs))
	for _, rawDoc := range rawDocs {
		requests = append(requests, convertToScriptRequestWithID(rawDoc))
	}

	// Return empty array instead of null if no requests
	if requests == nil {
		requests = []ScriptRequestWithID{}
	}

	respondWithJSON(w, http.StatusOK, requests)
}

// handleCreateScriptRequest creates a new script request
// POST /api/script-request
func handleCreateScriptRequest(w http.ResponseWriter, r *http.Request, collection *mongo.Collection) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var req scripts.ScriptRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	result, err := collection.InsertOne(ctx, req)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error creating script request")
		return
	}

	// Fetch the inserted request with ID
	var rawDoc bson.M
	err = collection.FindOne(ctx, bson.M{"_id": result.InsertedID}).Decode(&rawDoc)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error retrieving created script request")
		return
	}

	// Convert to ScriptRequestWithID
	reqWithID := convertToScriptRequestWithID(rawDoc)
	respondWithJSON(w, http.StatusCreated, reqWithID)
}

// handleUpdateScriptRequest updates an existing script request
// PUT /api/script-request?id=xxx
func handleUpdateScriptRequest(w http.ResponseWriter, r *http.Request, collection *mongo.Collection) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	reqID := r.URL.Query().Get("id")
	if reqID == "" {
		respondWithError(w, http.StatusBadRequest, "Script request ID is required")
		return
	}

	objectID, err := primitive.ObjectIDFromHex(reqID)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid script request ID format")
		return
	}

	var updateReq scripts.ScriptRequest
	if err := json.NewDecoder(r.Body).Decode(&updateReq); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Convert struct to map
	jsonBytes, err := json.Marshal(updateReq)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error processing update")
		return
	}

	var updateFields map[string]interface{}
	if err := json.Unmarshal(jsonBytes, &updateFields); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error processing update")
		return
	}

	// Remove _id from update fields if present
	delete(updateFields, "_id")

	// Remove null/empty fields
	for key, value := range updateFields {
		if value == nil || value == "" {
			delete(updateFields, key)
		}
	}

	if len(updateFields) == 0 {
		respondWithError(w, http.StatusBadRequest, "No fields to update")
		return
	}

	update := bson.M{
		"$set": updateFields,
	}

	result, err := collection.UpdateOne(ctx, bson.M{"_id": objectID}, update)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error updating script request")
		return
	}

	if result.MatchedCount == 0 {
		respondWithError(w, http.StatusNotFound, "Script request not found")
		return
	}

	// Fetch and return the updated request
	var rawDoc bson.M
	err = collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&rawDoc)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error retrieving updated script request")
		return
	}

	updatedReq := convertToScriptRequestWithID(rawDoc)
	respondWithJSON(w, http.StatusOK, updatedReq)
}

// handleDeleteScriptRequest deletes a script request
// DELETE /api/script-request?id=xxx
func handleDeleteScriptRequest(w http.ResponseWriter, r *http.Request, collection *mongo.Collection) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	reqID := r.URL.Query().Get("id")
	if reqID == "" {
		respondWithError(w, http.StatusBadRequest, "Script request ID is required")
		return
	}

	objectID, err := primitive.ObjectIDFromHex(reqID)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid script request ID format")
		return
	}

	result, err := collection.DeleteOne(ctx, bson.M{"_id": objectID})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error deleting script request")
		return
	}

	if result.DeletedCount == 0 {
		respondWithError(w, http.StatusNotFound, "Script request not found")
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]string{
		"message": "Script request deleted successfully",
		"id":      reqID,
	})
}

// convertToScriptRequestWithID converts a bson.M to ScriptRequestWithID
func convertToScriptRequestWithID(rawDoc bson.M) ScriptRequestWithID {
	req := ScriptRequestWithID{}

	// Extract and convert _id to string
	if id, ok := rawDoc["_id"].(primitive.ObjectID); ok {
		req.ID = id.Hex()
	}

	// Marshal and unmarshal to populate ScriptRequest fields
	docBytes, _ := bson.Marshal(rawDoc)
	bson.Unmarshal(docBytes, &req.ScriptRequest)

	return req
}

// buildScriptRequestFilterFromQuery builds a MongoDB filter from URL query parameters
func buildScriptRequestFilterFromQuery(r *http.Request) bson.M {
	filter := bson.M{}
	query := r.URL.Query()

	if simModal := query.Get("simulation_modal"); simModal != "" {
		filter["simulation_modal"] = bson.M{"$regex": simModal, "$options": "i"}
	}
	if caseSetting := query.Get("case_setting"); caseSetting != "" {
		filter["case_setting"] = bson.M{"$regex": caseSetting, "$options": "i"}
	}
	if chiefConcern := query.Get("chief_concern"); chiefConcern != "" {
		filter["chief_concern"] = bson.M{"$regex": chiefConcern, "$options": "i"}
	}
	if diagnosis := query.Get("diagnosis"); diagnosis != "" {
		filter["diagnosis"] = bson.M{"$regex": diagnosis, "$options": "i"}
	}
	if event := query.Get("event"); event != "" {
		filter["event"] = bson.M{"$regex": event, "$options": "i"}
	}
	if pedagogy := query.Get("pedagogy"); pedagogy != "" {
		filter["pedagogy"] = bson.M{"$regex": pedagogy, "$options": "i"}
	}
	if class := query.Get("class"); class != "" {
		filter["class"] = bson.M{"$regex": class, "$options": "i"}
	}
	if learnerLevel := query.Get("learner_level"); learnerLevel != "" {
		filter["learner_level"] = learnerLevel
	}

	// Search query - searches across multiple fields
	if search := query.Get("search"); search != "" {
		filter["$or"] = []bson.M{
			{"chief_concern": bson.M{"$regex": search, "$options": "i"}},
			{"diagnosis": bson.M{"$regex": search, "$options": "i"}},
			{"summary_patient_story": bson.M{"$regex": search, "$options": "i"}},
			{"case_setting": bson.M{"$regex": search, "$options": "i"}},
		}
	}

	return filter
}
