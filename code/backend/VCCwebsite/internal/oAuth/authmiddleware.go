package oAuth

import (
	"context"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// OktaConfig holds the Okta configuration
type OktaConfig struct {
	Domain   string // e.g., "dev-123456.okta.com"
	Audience string // Your API audience/client ID
	Issuer   string // e.g., "https://dev-123456.okta.com/oauth2/default"
}

// JWKSet represents the JSON Web Key Set from Okta
type JWKSet struct {
	Keys []JWK `json:"keys"`
}

// JWK represents a single JSON Web Key
type JWK struct {
	Kid string   `json:"kid"`
	Kty string   `json:"kty"`
	Alg string   `json:"alg"`
	Use string   `json:"use"`
	N   string   `json:"n"`
	E   string   `json:"e"`
	X5c []string `json:"x5c"`
}

// Claims represents the JWT claims we care about
type Claims struct {
	jwt.RegisteredClaims
	Scp   string `json:"scp,omitempty"`   // Scopes
	Sub   string `json:"sub"`             // Subject (user ID)
	Email string `json:"email,omitempty"` // User email
	Name  string `json:"name,omitempty"`  // User name
}

// AuthMiddleware validates Okta JWT tokens
type AuthMiddleware struct {
	config *OktaConfig
	client *http.Client
}

// NewAuthMiddleware creates a new authentication middleware
func NewAuthMiddleware(config *OktaConfig) *AuthMiddleware {
	return &AuthMiddleware{
		config: config,
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

// Middleware is the HTTP middleware function
func (am *AuthMiddleware) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Extract token from Authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Missing authorization header", http.StatusUnauthorized)
			return
		}

		// Check for Bearer token format
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			http.Error(w, "Invalid authorization header format", http.StatusUnauthorized)
			return
		}

		tokenString := parts[1]

		// Validate the token
		claims, err := am.ValidateToken(tokenString)
		if err != nil {
			http.Error(w, fmt.Sprintf("Invalid token: %v", err), http.StatusUnauthorized)
			return
		}

		// Add claims to request context
		ctx := context.WithValue(r.Context(), "claims", claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// ValidateToken validates the JWT token with Okta
func (am *AuthMiddleware) ValidateToken(tokenString string) (*Claims, error) {
	// Parse the token without verification first to get the kid
	token, _, err := new(jwt.Parser).ParseUnverified(tokenString, &Claims{})
	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	kid, ok := token.Header["kid"].(string)
	if !ok {
		return nil, fmt.Errorf("token missing kid header")
	}

	// Get the public key from Okta's JWKS endpoint
	publicKey, err := am.getPublicKey(kid)
	if err != nil {
		return nil, fmt.Errorf("failed to get public key: %w", err)
	}

	// Parse and validate the token
	claims := &Claims{}
	parsedToken, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		// Verify signing algorithm
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return publicKey, nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token with claims: %w", err)
	}

	if !parsedToken.Valid {
		return nil, fmt.Errorf("token is invalid")
	}

	// Validate issuer
	if claims.Issuer != am.config.Issuer {
		return nil, fmt.Errorf("invalid issuer: expected %s, got %s", am.config.Issuer, claims.Issuer)
	}

	// Validate audience
	validAudience := false
	for _, aud := range claims.Audience {
		if aud == am.config.Audience {
			validAudience = true
			break
		}
	}
	if !validAudience {
		return nil, fmt.Errorf("invalid audience")
	}

	// Validate expiration
	if time.Now().After(claims.ExpiresAt.Time) {
		return nil, fmt.Errorf("token has expired")
	}

	return claims, nil
}

// getPublicKey fetches the public key from Okta's JWKS endpoint
func (am *AuthMiddleware) getPublicKey(kid string) (interface{}, error) {
	// Fetch JWKS from Okta
	jwksURL := fmt.Sprintf("%s/v1/keys", am.config.Issuer)

	resp, err := am.client.Get(jwksURL)
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

	// Find the key with matching kid
	for _, key := range jwks.Keys {
		if key.Kid == kid {
			// Convert JWK to RSA public key
			if len(key.X5c) > 0 {
				// Use X.509 certificate if available
				return parseX509Certificate(key.X5c[0])
			}
			// Otherwise use n and e modulus/exponent
			return parseRSAPublicKey(key.N, key.E)
		}
	}

	return nil, fmt.Errorf("no key found with kid: %s", kid)
}

// parseX509Certificate parses an X.509 certificate to extract the RSA public key
func parseX509Certificate(certStr string) (*rsa.PublicKey, error) {
	certBytes, err := base64.StdEncoding.DecodeString(certStr)
	if err != nil {
		return nil, fmt.Errorf("failed to decode certificate: %w", err)
	}

	cert, err := x509.ParseCertificate(certBytes)
	if err != nil {
		return nil, fmt.Errorf("failed to parse certificate: %w", err)
	}

	rsaPublicKey, ok := cert.PublicKey.(*rsa.PublicKey)
	if !ok {
		return nil, fmt.Errorf("certificate does not contain RSA public key")
	}

	return rsaPublicKey, nil
}

// parseRSAPublicKey constructs an RSA public key from n and e components
func parseRSAPublicKey(nStr, eStr string) (*rsa.PublicKey, error) {
	// Decode n (modulus)
	nBytes, err := base64.RawURLEncoding.DecodeString(nStr)
	if err != nil {
		return nil, fmt.Errorf("failed to decode n: %w", err)
	}

	// Decode e (exponent)
	eBytes, err := base64.RawURLEncoding.DecodeString(eStr)
	if err != nil {
		return nil, fmt.Errorf("failed to decode e: %w", err)
	}

	// Convert to big.Int
	n := new(big.Int).SetBytes(nBytes)
	e := new(big.Int).SetBytes(eBytes)

	return &rsa.PublicKey{
		N: n,
		E: int(e.Int64()),
	}, nil
}

// GetClaimsFromContext extracts claims from the request context
func GetClaimsFromContext(ctx context.Context) (*Claims, bool) {
	claims, ok := ctx.Value("claims").(*Claims)
	return claims, ok
}
