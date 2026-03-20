package api

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	scripts "VCCwebsite/internal/model"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/gridfs"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const (
	maxArtifactSize = 5 * 1024 * 1024 // 5MB
	artifactBucket  = "artifacts"
)

var allowedArtifactTypes = map[string]bool{
	"application/pdf": true,
	"image/png":       true,
	"image/jpeg":      true,
}

func ArtifactHandler(client *mongo.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		if client == nil {
			respondWithError(w, http.StatusServiceUnavailable, "Database connection not available")
			return
		}

		db := client.Database("vccwebsite")
		bucket, err := gridfs.NewBucket(db, options.GridFSBucket().SetName(artifactBucket))
		if err != nil {
			respondWithError(w, http.StatusInternalServerError, "Unable to initialize artifact storage")
			return
		}

		switch r.Method {
		case http.MethodPost:
			handleArtifactUpload(w, r, bucket)
		case http.MethodGet:
			handleArtifactDownload(w, r, bucket)
		case http.MethodDelete:
			handleArtifactDelete(w, r, bucket)
		default:
			respondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		}
	}
}

func handleArtifactUpload(w http.ResponseWriter, r *http.Request, bucket *gridfs.Bucket) {
	// allow a bit of overhead for multipart boundaries
	r.Body = http.MaxBytesReader(w, r.Body, maxArtifactSize+1024*1024)
	if err := r.ParseMultipartForm(maxArtifactSize + 1024*1024); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid upload payload")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "File is required")
		return
	}
	defer file.Close()

	if header.Size > maxArtifactSize {
		respondWithError(w, http.StatusBadRequest, "File exceeds 5MB limit")
		return
	}

	buffer := make([]byte, 512)
	n, _ := file.Read(buffer)
	detected := http.DetectContentType(buffer[:n])
	if !isAllowedArtifactType(detected, header.Filename) {
		respondWithError(w, http.StatusBadRequest, "Unsupported file type")
		return
	}

	reader := io.MultiReader(bytes.NewReader(buffer[:n]), file)
	uploadedAt := time.Now().UTC().Format(time.RFC3339)

	uploadOpts := options.GridFSUpload().SetMetadata(bson.M{
		"content_type": detected,
		"size":         header.Size,
		"uploaded_at":  uploadedAt,
	})

	uploadID, err := bucket.UploadFromStream(header.Filename, reader, uploadOpts)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to store artifact")
		return
	}
	artifactID := uploadID.Hex()

	artifact := scripts.Artifact{
		ID:          artifactID,
		Name:        header.Filename,
		ContentType: detected,
		Size:        header.Size,
		UploadedAt:  uploadedAt,
		URL:         fmt.Sprintf("/api/artifact?id=%s", artifactID),
	}

	respondWithJSON(w, http.StatusCreated, artifact)
}

func handleArtifactDownload(w http.ResponseWriter, r *http.Request, bucket *gridfs.Bucket) {
	artifactID := r.URL.Query().Get("id")
	if artifactID == "" {
		respondWithError(w, http.StatusBadRequest, "Artifact ID is required")
		return
	}

	objectID, err := primitive.ObjectIDFromHex(artifactID)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid artifact ID format")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var fileDoc bson.M
	err = bucket.GetFilesCollection().FindOne(ctx, bson.M{"_id": objectID}).Decode(&fileDoc)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			respondWithError(w, http.StatusNotFound, "Artifact not found")
			return
		}
		respondWithError(w, http.StatusInternalServerError, "Error retrieving artifact")
		return
	}

	filename := getString(fileDoc["filename"], "artifact")
	contentType := ""
	if meta, ok := fileDoc["metadata"].(bson.M); ok {
		contentType = getString(meta["content_type"], "")
		if contentType == "" {
			contentType = getString(meta["contentType"], "")
		}
	}
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	if length, ok := fileDoc["length"].(int64); ok && length > 0 {
		w.Header().Set("Content-Length", fmt.Sprintf("%d", length))
	}

	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", sanitizeFilename(filename)))

	if _, err := bucket.DownloadToStream(objectID, w); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to stream artifact")
		return
	}
}

func handleArtifactDelete(w http.ResponseWriter, r *http.Request, bucket *gridfs.Bucket) {
	artifactID := r.URL.Query().Get("id")
	if artifactID == "" {
		respondWithError(w, http.StatusBadRequest, "Artifact ID is required")
		return
	}

	objectID, err := primitive.ObjectIDFromHex(artifactID)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid artifact ID format")
		return
	}

	if err := bucket.Delete(objectID); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error deleting artifact")
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]string{
		"message": "Artifact deleted successfully",
		"id":      artifactID,
	})
}

func isAllowedArtifactType(detected, filename string) bool {
	if allowedArtifactTypes[detected] {
		return true
	}
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".pdf", ".png", ".jpg", ".jpeg":
		return true
	default:
		return false
	}
}

func sanitizeFilename(name string) string {
	clean := strings.ReplaceAll(name, `"`, "")
	clean = strings.ReplaceAll(clean, "\n", "")
	clean = strings.ReplaceAll(clean, "\r", "")
	if clean == "" {
		return "artifact"
	}
	return clean
}

func getString(value interface{}, fallback string) string {
	if value == nil {
		return fallback
	}
	switch v := value.(type) {
	case string:
		return v
	default:
		return fmt.Sprint(v)
	}
}
