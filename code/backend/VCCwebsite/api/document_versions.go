// api/document_versions.go
package api

import (
	"VCCwebsite/internal/model"
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// DocumentVersion represents a historical version of a document
type DocumentVersion struct {
	ID            primitive.ObjectID         `bson:"_id,omitempty" json:"id"`
	DocumentID    primitive.ObjectID         `bson:"document_id" json:"document_id"`
	VersionNumber int                        `bson:"version_number" json:"version_number"`
	Document      scripts.StandardizedScript `bson:"document" json:"document"`
	CreatedAt     time.Time                  `bson:"created_at" json:"created_at"`
	CreatedBy     string                     `bson:"created_by,omitempty" json:"created_by,omitempty"`
	ChangeNote    string                     `bson:"change_note,omitempty" json:"change_note,omitempty"`
}

// saveVersion saves the current document as a new version
func saveVersion(ctx context.Context, collection *mongo.Collection, versionsCollection *mongo.Collection, docID primitive.ObjectID, changeNote string, createdBy string) error {
	// Get the current document
	var currentDoc scripts.StandardizedScript
	err := collection.FindOne(ctx, bson.M{"_id": docID}).Decode(&currentDoc)
	if err != nil {
		return err
	}

	// Get the latest version number
	var latestVersion DocumentVersion
	opts := options.FindOne().SetSort(bson.D{{Key: "version_number", Value: -1}})
	err = versionsCollection.FindOne(ctx, bson.M{"document_id": docID}, opts).Decode(&latestVersion)

	versionNumber := 1
	if err == nil {
		// Found a previous version, increment
		versionNumber = latestVersion.VersionNumber + 1
	} else if err != mongo.ErrNoDocuments {
		// Real error (not just "no documents found")
		return err
	}

	// Create the version document
	version := DocumentVersion{
		DocumentID:    docID,
		VersionNumber: versionNumber,
		Document:      currentDoc,
		CreatedAt:     time.Now(),
		CreatedBy:     createdBy,
		ChangeNote:    changeNote,
	}

	// Insert the version
	_, err = versionsCollection.InsertOne(ctx, version)
	return err
}

// HandleGetVersionHistory retrieves all versions of a document
// GET /api/document/versions?id=xxx
func HandleGetVersionHistory(w http.ResponseWriter, r *http.Request, versionsCollection *mongo.Collection) {
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

	// Find all versions for this document, sorted by version number descending (newest first)
	opts := options.Find().SetSort(bson.D{{Key: "version_number", Value: -1}})
	cursor, err := versionsCollection.Find(ctx, bson.M{"document_id": objectID}, opts)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error retrieving version history")
		return
	}
	defer cursor.Close(ctx)

	var versions []DocumentVersion
	if err = cursor.All(ctx, &versions); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error decoding versions")
		return
	}

	if versions == nil {
		versions = []DocumentVersion{}
	}

	respondWithJSON(w, http.StatusOK, versions)
}

// HandleGetSpecificVersion retrieves a specific version of a document
// GET /api/document/version?id=xxx&version=2
func HandleGetSpecificVersion(w http.ResponseWriter, r *http.Request, versionsCollection *mongo.Collection) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	docID := r.URL.Query().Get("id")
	if docID == "" {
		respondWithError(w, http.StatusBadRequest, "Document ID is required")
		return
	}

	versionStr := r.URL.Query().Get("version")
	if versionStr == "" {
		respondWithError(w, http.StatusBadRequest, "Version number is required")
		return
	}

	objectID, err := primitive.ObjectIDFromHex(docID)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid document ID format")
		return
	}

	versionNum, err := strconv.Atoi(versionStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid version number")
		return
	}

	var version DocumentVersion
	err = versionsCollection.FindOne(ctx, bson.M{
		"document_id":    objectID,
		"version_number": versionNum,
	}).Decode(&version)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			respondWithError(w, http.StatusNotFound, "Version not found")
			return
		}
		respondWithError(w, http.StatusInternalServerError, "Error retrieving version")
		return
	}

	respondWithJSON(w, http.StatusOK, version)
}

// HandleRestoreVersion restores a document to a specific version
// POST /api/document/restore?id=xxx&version=2
func HandleRestoreVersion(w http.ResponseWriter, r *http.Request, collection *mongo.Collection, versionsCollection *mongo.Collection) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	docID := r.URL.Query().Get("id")
	if docID == "" {
		respondWithError(w, http.StatusBadRequest, "Document ID is required")
		return
	}

	versionStr := r.URL.Query().Get("version")
	if versionStr == "" {
		respondWithError(w, http.StatusBadRequest, "Version number is required")
		return
	}

	objectID, err := primitive.ObjectIDFromHex(docID)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid document ID format")
		return
	}

	versionNum, err := strconv.Atoi(versionStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid version number")
		return
	}

	// Get the version to restore
	var version DocumentVersion
	err = versionsCollection.FindOne(ctx, bson.M{
		"document_id":    objectID,
		"version_number": versionNum,
	}).Decode(&version)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			respondWithError(w, http.StatusNotFound, "Version not found")
			return
		}
		respondWithError(w, http.StatusInternalServerError, "Error retrieving version")
		return
	}

	// Save current state as a version before restoring
	err = saveVersion(ctx, collection, versionsCollection, objectID, "Before restore to version "+versionStr, "system")
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error saving current version before restore")
		return
	}

	// Restore the document by replacing it with the version's document
	result, err := collection.ReplaceOne(ctx, bson.M{"_id": objectID}, version.Document)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error restoring document")
		return
	}

	if result.MatchedCount == 0 {
		respondWithError(w, http.StatusNotFound, "Document not found")
		return
	}

	// Save the restored state as a new version
	err = saveVersion(ctx, collection, versionsCollection, objectID, "Restored to version "+versionStr, "system")
	if err != nil {
		// Document was restored but we couldn't save the version - log but don't fail
		// In production, you might want to handle this differently
	}

	respondWithJSON(w, http.StatusOK, map[string]string{
		"message": "Document restored to version " + versionStr,
		"id":      docID,
	})
}

// Modified handleUpdateDocument to save versions
// Replace your existing handleUpdateDocument with this version
func handleUpdateDocumentWithVersioning(w http.ResponseWriter, r *http.Request, collection *mongo.Collection, versionsCollection *mongo.Collection) {
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

	// Save current version before updating
	changeNote := r.URL.Query().Get("change_note")
	createdBy := r.URL.Query().Get("created_by")

	err = saveVersion(ctx, collection, versionsCollection, objectID, changeNote, createdBy)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error saving version before update")
		return
	}

	// Continue with normal update logic
	var updateDoc scripts.StandardizedScript
	if err := json.NewDecoder(r.Body).Decode(&updateDoc); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

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

	delete(updateFields, "_id")

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
		respondWithError(w, http.StatusInternalServerError, "Error updating document")
		return
	}

	if result.MatchedCount == 0 {
		respondWithError(w, http.StatusNotFound, "Document not found")
		return
	}

	var rawDoc bson.M
	err = collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&rawDoc)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error retrieving updated document")
		return
	}

	updatedDoc := convertToDocumentWithID(rawDoc)
	respondWithJSON(w, http.StatusOK, updatedDoc)
}
