package db

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var mongoURIEnvCandidates = []string{
	"MONGO_URI",
	"MONGO_URL",
	"MONGO_PUBLIC_URL",
	"MONGODB_URI",
	"MONGODB_URL",
	"DATABASE_URL",
}

func isMongoURI(uri string) bool {
	return strings.HasPrefix(uri, "mongodb://") || strings.HasPrefix(uri, "mongodb+srv://")
}

// ResolveMongoURI returns the first usable Mongo URI from known environment variables.
func ResolveMongoURI() (uri string, sourceEnv string) {
	for _, key := range mongoURIEnvCandidates {
		value := strings.TrimSpace(os.Getenv(key))
		if value == "" {
			continue
		}
		if !isMongoURI(value) {
			continue
		}
		return value, key
	}
	return "", ""
}

// Connect reads a Mongo URI from known env names and returns a connected client.
// If no usable URI is found, it returns (nil, nil) so callers can choose behavior.
func Connect(ctx context.Context) (*mongo.Client, error) {
	client, _, err := ConnectWithSource(ctx)
	return client, err
}

// ConnectWithSource behaves like Connect but also returns the env var name used.
func ConnectWithSource(ctx context.Context) (*mongo.Client, string, error) {
	uri, source := ResolveMongoURI()
	if uri == "" {
		return nil, "", nil
	}

	clientOpts := options.Client().ApplyURI(uri)
	client, err := mongo.NewClient(clientOpts)
	if err != nil {
		return nil, source, err
	}

	cctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	if err := client.Connect(cctx); err != nil {
		return nil, source, err
	}

	pingCtx, pingCancel := context.WithTimeout(ctx, 5*time.Second)
	defer pingCancel()
	if err := client.Ping(pingCtx, nil); err != nil {
		_ = client.Disconnect(ctx)
		return nil, source, err
	}

	return client, source, nil
}

// MongoConfigHint returns a short operator-facing hint.
func MongoConfigHint() string {
	return fmt.Sprintf("set one of: %s", strings.Join(mongoURIEnvCandidates, ", "))
}

// MustDisconnect tries to disconnect the client, ignoring errors.
func MustDisconnect(ctx context.Context, client *mongo.Client) error {
	if client == nil {
		return nil
	}
	cctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	return client.Disconnect(cctx)
}
