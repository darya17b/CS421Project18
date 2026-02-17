package oAuth

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// CachedAuthMiddleware extends AuthMiddleware with JWKS caching
type CachedAuthMiddleware struct {
	*AuthMiddleware
	jwksCache     *JWKSCache
	cacheDuration time.Duration
}

// JWKSCache stores the cached JWKS
type JWKSCache struct {
	mu        sync.RWMutex
	jwks      *JWKSet
	expiresAt time.Time
}

// NewCachedAuthMiddleware creates an auth middleware with JWKS caching
func NewCachedAuthMiddleware(config *OktaConfig, cacheDuration time.Duration) *CachedAuthMiddleware {
	if cacheDuration == 0 {
		cacheDuration = 1 * time.Hour // Default cache duration
	}

	return &CachedAuthMiddleware{
		AuthMiddleware: NewAuthMiddleware(config),
		jwksCache: &JWKSCache{
			expiresAt: time.Now(), // Expired initially
		},
		cacheDuration: cacheDuration,
	}
}

// getPublicKey fetches the public key with caching
func (cam *CachedAuthMiddleware) getPublicKey(kid string) (interface{}, error) {
	// Check if cache is valid
	cam.jwksCache.mu.RLock()
	if time.Now().Before(cam.jwksCache.expiresAt) && cam.jwksCache.jwks != nil {
		jwks := cam.jwksCache.jwks
		cam.jwksCache.mu.RUnlock()

		// Find key in cached JWKS
		for _, key := range jwks.Keys {
			if key.Kid == kid {
				return cam.parsePublicKey(&key)
			}
		}
		// If key not found in cache, refresh cache
	} else {
		cam.jwksCache.mu.RUnlock()
	}

	// Cache miss or expired - fetch new JWKS
	cam.jwksCache.mu.Lock()
	defer cam.jwksCache.mu.Unlock()

	// Double-check after acquiring write lock
	if time.Now().Before(cam.jwksCache.expiresAt) && cam.jwksCache.jwks != nil {
		for _, key := range cam.jwksCache.jwks.Keys {
			if key.Kid == kid {
				return cam.parsePublicKey(&key)
			}
		}
	}

	// Fetch fresh JWKS
	jwks, err := cam.fetchJWKS()
	if err != nil {
		return nil, err
	}

	// Update cache
	cam.jwksCache.jwks = jwks
	cam.jwksCache.expiresAt = time.Now().Add(cam.cacheDuration)

	// Find the key
	for _, key := range jwks.Keys {
		if key.Kid == kid {
			return cam.parsePublicKey(&key)
		}
	}

	return nil, fmt.Errorf("no key found with kid: %s", kid)
}

// fetchJWKS fetches the JWKS from Okta
func (cam *CachedAuthMiddleware) fetchJWKS() (*JWKSet, error) {
	jwksURL := fmt.Sprintf("%s/v1/keys", cam.config.Issuer)

	resp, err := cam.client.Get(jwksURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch JWKS: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("JWKS endpoint returned status: %d", resp.StatusCode)
	}

	var jwks JWKSet
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return nil, fmt.Errorf("failed to decode JWKS: %w", err)
	}

	return &jwks, nil
}

// parsePublicKey converts a JWK to a public key
func (cam *CachedAuthMiddleware) parsePublicKey(key *JWK) (interface{}, error) {
	if len(key.X5c) == 0 {
		return nil, fmt.Errorf("key missing x5c certificate")
	}

	return jwt.ParseRSAPublicKeyFromPEM([]byte(fmt.Sprintf(
		"-----BEGIN CERTIFICATE-----\n%s\n-----END CERTIFICATE-----",
		key.X5c[0],
	)))
}

// Example usage in main.go:
// authMiddleware := NewCachedAuthMiddleware(config, 1*time.Hour)
