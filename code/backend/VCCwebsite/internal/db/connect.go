package db

import (
    "context"
    "os"
    "time"

    "go.mongodb.org/mongo-driver/mongo"
    "go.mongodb.org/mongo-driver/mongo/options"
)

// Connect reads MONGO_URI from environment and returns a connected *mongo.Client.
// If MONGO_URI is empty, it returns (nil, nil) so the caller can continue without DB.
func Connect(ctx context.Context) (*mongo.Client, error) {
    uri := os.Getenv("MONGO_URI")
    if uri == "" {
        // No URI provided — caller can decide to run without DB.
        return nil, nil
    }

    clientOpts := options.Client().ApplyURI(uri)
    client, err := mongo.NewClient(clientOpts)
    if err != nil {
        return nil, err
    }

    cctx, cancel := context.WithTimeout(ctx, 10*time.Second)
    defer cancel()
    if err := client.Connect(cctx); err != nil {
        return nil, err
    }

    // Optional ping to verify the connection
    pingCtx, pingCancel := context.WithTimeout(ctx, 5*time.Second)
    defer pingCancel()
    if err := client.Ping(pingCtx, nil); err != nil {
        // disconnect before returning error
        _ = client.Disconnect(ctx)
        return nil, err
    }

    return client, nil
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
