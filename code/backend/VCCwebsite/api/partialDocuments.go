// api/document_partial.go
package api

import (
	"context"
	"net/http"
	"time"

	"VCCwebsite/internal/model"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// HandleGetMedications retrieves just the medications for a document
// GET /api/document/medications?id=xxx
func HandleGetMedications(w http.ResponseWriter, r *http.Request, collection *mongo.Collection) {
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

	var doc scripts.StandardizedScript
	err = collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&doc)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			respondWithError(w, http.StatusNotFound, "Document not found")
			return
		}
		respondWithError(w, http.StatusInternalServerError, "Error retrieving document")
		return
	}

	respondWithJSON(w, http.StatusOK, doc.MedHist.Medications)
}

// HandleGetVitals retrieves just the vitals for a document
// GET /api/document/vitals?id=xxx
func HandleGetVitals(w http.ResponseWriter, r *http.Request, collection *mongo.Collection) {
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

	var doc scripts.StandardizedScript
	err = collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&doc)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			respondWithError(w, http.StatusNotFound, "Document not found")
			return
		}
		respondWithError(w, http.StatusInternalServerError, "Error retrieving document")
		return
	}

	respondWithJSON(w, http.StatusOK, doc.Patient.Vitals)
}
