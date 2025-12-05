package api

import (
	"VCCwebsite/internal/model"
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// DocumentHandler handles all document-related REST API endpoints

func DocumentHandler(client *mongo.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		if client == nil {
			respondWithError(w, http.StatusServiceUnavailable, "Database connection not available")
			return
		}

		collection := client.Database("vccwebsite").Collection("scripts")
		versionsCollection := client.Database("vccwebsite").Collection("scripts_versions")

		path := r.URL.Path

		// Check for /api/document/versions (get all versions of a document)
		if strings.HasSuffix(path, "/versions") {
			if r.Method == http.MethodGet {
				HandleGetVersionHistory(w, r, versionsCollection)
				return
			}
			respondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
			return
		}

		// Check for /api/document/version (get specific version)
		if strings.HasSuffix(path, "/version") {
			if r.Method == http.MethodGet {
				HandleGetSpecificVersion(w, r, versionsCollection)
				return
			}
			respondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
			return
		}

		// Check for /api/document/restore (restore to specific version)
		if strings.HasSuffix(path, "/restore") {
			if r.Method == http.MethodPost {
				HandleRestoreVersion(w, r, collection, versionsCollection)
				return
			}
			respondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
			return
		}

		// Check for /api/document/medications
		if strings.HasSuffix(path, "/medications") {
			if r.Method == http.MethodGet {
				HandleGetMedications(w, r, collection)
				return
			}
			respondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
			return
		}

		// Check for /api/document/vitals
		if strings.HasSuffix(path, "/vitals") {
			if r.Method == http.MethodGet {
				HandleGetVitals(w, r, collection)
				return
			}
			respondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
			return
		}

		// Original routing for base /api/document
		switch r.Method {
		case http.MethodGet:
			handleGetDocuments(w, r, collection)
		case http.MethodPost:
			handleCreateDocument(w, r, collection)
		case http.MethodPut:
			// Use the new versioning update handler
			handleUpdateDocumentWithVersioning(w, r, collection, versionsCollection)
		case http.MethodDelete:
			handleDeleteDocument(w, r, collection)
		default:
			respondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		}
	}
} // DocumentWithID wraps StandardizedScript with MongoDB ID
type DocumentWithID struct {
	ID string `json:"id"`
	scripts.StandardizedScript
}

// handleGetDocuments retrieves documents
// GET /api/document - get all documents
// GET /api/document?id=xxx - get specific document by ID
// GET /api/document?title=xxx - search by admin title
// GET /api/document?author=xxx - search by admin author
// GET /api/document?diagnosis=xxx - search by admin diagnosis
// GET /api/document?learner_level=xxx - search by learner level
// GET /api/document?patient_name=xxx - search by patient name
func handleGetDocuments(w http.ResponseWriter, r *http.Request, collection *mongo.Collection) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Check if requesting a specific document by ID
	docID := r.URL.Query().Get("id")
	if docID != "" {
		objectID, err := primitive.ObjectIDFromHex(docID)
		if err != nil {
			respondWithError(w, http.StatusBadRequest, "Invalid document ID format")
			return
		}

		var rawDoc bson.M
		err = collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&rawDoc)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				respondWithError(w, http.StatusNotFound, "Document not found")
				return
			}
			respondWithError(w, http.StatusInternalServerError, "Error retrieving document")
			return
		}

		// Convert to DocumentWithID
		doc := convertToDocumentWithID(rawDoc)
		respondWithJSON(w, http.StatusOK, doc)
		return
	}

	// Build filter based on query parameters
	filter := buildFilterFromQuery(r)

	// Get documents with filter
	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error retrieving documents")
		return
	}
	defer cursor.Close(ctx)

	var rawDocs []bson.M
	if err = cursor.All(ctx, &rawDocs); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error decoding documents")
		return
	}

	// Convert to DocumentWithID slice
	documents := make([]DocumentWithID, 0, len(rawDocs))
	for _, rawDoc := range rawDocs {
		documents = append(documents, convertToDocumentWithID(rawDoc))
	}

	// Return empty array instead of null if no documents
	if documents == nil {
		documents = []DocumentWithID{}
	}

	respondWithJSON(w, http.StatusOK, documents)
}

// handleCreateDocument creates a new document
// POST /api/document
func handleCreateDocument(w http.ResponseWriter, r *http.Request, collection *mongo.Collection) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var doc scripts.StandardizedScript
	if err := json.NewDecoder(r.Body).Decode(&doc); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate required fields based on your struct
	// Add validation as needed for your specific use case

	result, err := collection.InsertOne(ctx, doc)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error creating document")
		return
	}

	// Fetch the inserted document with ID
	var rawDoc bson.M
	err = collection.FindOne(ctx, bson.M{"_id": result.InsertedID}).Decode(&rawDoc)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error retrieving created document")
		return
	}

	// Convert to DocumentWithID
	docWithID := convertToDocumentWithID(rawDoc)
	respondWithJSON(w, http.StatusCreated, docWithID)
}

// handleUpdateDocument updates an existing document
// PUT /api/document?id=xxx
func handleUpdateDocument(w http.ResponseWriter, r *http.Request, collection *mongo.Collection) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	docID := r.URL.Query().Get("id")
	if docID == "" {
		respondWithError(w, http.StatusBadRequest, "Document ID is required")
		return
	}

	objectID, err := primitive.ObjectIDFromHex(docID)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid document ID format")
		return
	}

	var updateDoc scripts.StandardizedScript
	if err := json.NewDecoder(r.Body).Decode(&updateDoc); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Build update document with all fields from StandardizedScript
	// Convert struct to map using JSON tags (which match your struct)
	jsonBytes, err := json.Marshal(updateDoc)
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

	// Remove null/empty fields to avoid overwriting with empty values
	for key, value := range updateFields {
		if value == nil || value == "" {
			delete(updateFields, key)
		}
	}

	// Only update if there are fields to update
	if len(updateFields) == 0 {
		respondWithError(w, http.StatusBadRequest, "No fields to update")
		return
	}

	update := bson.M{
		"$set": updateFields,
	}

	result, err := collection.UpdateOne(ctx, bson.M{"_id": objectID}, update)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error updating document")
		return
	}

	if result.MatchedCount == 0 {
		respondWithError(w, http.StatusNotFound, "Document not found")
		return
	}

	// Fetch and return the updated document
	var rawDoc bson.M
	err = collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&rawDoc)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error retrieving updated document")
		return
	}

	// Convert to DocumentWithID
	updatedDoc := convertToDocumentWithID(rawDoc)
	respondWithJSON(w, http.StatusOK, updatedDoc)
}

// handleDeleteDocument deletes a document
// DELETE /api/document?id=xxx
func handleDeleteDocument(w http.ResponseWriter, r *http.Request, collection *mongo.Collection) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	docID := r.URL.Query().Get("id")
	if docID == "" {
		respondWithError(w, http.StatusBadRequest, "Document ID is required")
		return
	}

	objectID, err := primitive.ObjectIDFromHex(docID)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid document ID format")
		return
	}

	result, err := collection.DeleteOne(ctx, bson.M{"_id": objectID})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error deleting document")
		return
	}

	if result.DeletedCount == 0 {
		respondWithError(w, http.StatusNotFound, "Document not found")
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]string{
		"message": "Document deleted successfully",
		"id":      docID,
	})
}

// Helper functions for JSON responses
func respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	response, err := json.Marshal(payload)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"Error encoding response"}`))
		return
	}
	w.WriteHeader(code)
	w.Write(response)
}

func respondWithError(w http.ResponseWriter, code int, message string) {
	respondWithJSON(w, code, map[string]string{"error": message})
}

// convertToDocumentWithID converts a bson.M to DocumentWithID
func convertToDocumentWithID(rawDoc bson.M) DocumentWithID {
	doc := DocumentWithID{}

	// Extract and convert _id to string
	if id, ok := rawDoc["_id"].(primitive.ObjectID); ok {
		doc.ID = id.Hex()
	}

	// Marshal and unmarshal to populate StandardizedScript fields
	docBytes, _ := bson.Marshal(rawDoc)
	bson.Unmarshal(docBytes, &doc.StandardizedScript)

	return doc
}

// buildFilterFromQuery builds a MongoDB filter from URL query parameters
func buildFilterFromQuery(r *http.Request) bson.M {
	filter := bson.M{}
	query := r.URL.Query()

	// Admin fields
    if title := query.Get("title"); title != "" {
        filter["admin.reason_for_visit"] = bson.M{"$regex": title, "$options": "i"} // case-insensitive search
    }
	if chiefConcern := query.Get("chief_concern"); chiefConcern != "" {
		filter["admin.chief_concern"] = bson.M{"$regex": chiefConcern, "$options": "i"}
	}
	if diagnosis := query.Get("diagnosis"); diagnosis != "" {
		filter["admin.diagnosis"] = bson.M{"$regex": diagnosis, "$options": "i"}
	}
	if class := query.Get("class"); class != "" {
		filter["admin.class"] = class
	}
	if medicalEvent := query.Get("medical_event"); medicalEvent != "" {
		filter["admin.medical_event"] = bson.M{"$regex": medicalEvent, "$options": "i"}
	}
	if learnerLevel := query.Get("learner_level"); learnerLevel != "" {
		filter["admin.learner_level"] = learnerLevel
	}
	if academicYear := query.Get("academic_year"); academicYear != "" {
		filter["admin.academic_year"] = academicYear
	}
	if author := query.Get("author"); author != "" {
		filter["admin.author"] = bson.M{"$regex": author, "$options": "i"}
	}

	// Patient fields
	if patientName := query.Get("patient_name"); patientName != "" {
		filter["patient.name"] = bson.M{"$regex": patientName, "$options": "i"}
	}
	if age := query.Get("patient_age"); age != "" {
		filter["patient.age"] = age
	}
	if gender := query.Get("patient_gender"); gender != "" {
		filter["patient.gender"] = bson.M{"$regex": gender, "$options": "i"}
	}

	// SP fields
	if spName := query.Get("sp_name"); spName != "" {
		filter["sp.sp_name"] = bson.M{"$regex": spName, "$options": "i"}
	}

	// Search query - searches across multiple fields
	if search := query.Get("search"); search != "" {
        filter["$or"] = []bson.M{
            {"admin.reason_for_visit": bson.M{"$regex": search, "$options": "i"}},
            {"admin.chief_concern": bson.M{"$regex": search, "$options": "i"}},
            {"admin.diagnosis": bson.M{"$regex": search, "$options": "i"}},
            {"admin.author": bson.M{"$regex": search, "$options": "i"}},
            {"patient.name": bson.M{"$regex": search, "$options": "i"}},
            {"sp.sp_name": bson.M{"$regex": search, "$options": "i"}},
        }
	}

	return filter
}
