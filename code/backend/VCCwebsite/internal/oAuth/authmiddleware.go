package oAuth

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	verifier "github.com/okta/okta-jwt-verifier-golang"
)

// we encountered errors trying to get okat to work so this is left over code
// I suspect the way the application is set up on the IT side expects a webapp but this is a SPA
// I tried to communicate that to the IT team but got exhausted and gave up.

// OktaConfig holds the Okta configuration
type OktaConfig struct {
	Issuer   string // e.g., "https://dev-123456.okta.com/oauth2/default"
	ClientID string // Your Okta application client ID
}

// AuthMiddleware validates Okta JWT tokens using the official SDK
type AuthMiddleware struct {
	verifier *verifier.JwtVerifier
	config   *OktaConfig
}

// Claims represents the JWT claims
type Claims struct {
	Subject        string                 `json:"sub"`
	Email          string                 `json:"email,omitempty"`           // Standard email claim
	EmailPrimary   string                 `json:"email_primary,omitempty"`   // WSU primary email
	EmailSecondary string                 `json:"email_secondary,omitempty"` // WSU secondary email
	Name           string                 `json:"name,omitempty"`
	WSUID          string                 `json:"WSUID,omitempty"`      // WSU ID
	NID            string                 `json:"NID,omitempty"`        // WSU Network ID
	Department     string                 `json:"department,omitempty"` // WSU department
	Title          string                 `json:"title,omitempty"`      // WSU job title
	Groups         []string               `json:"groups,omitempty"`
	OktaGroups     []string               `json:"Okta_Groups,omitempty"` // WSU Okta groups
	Scopes         []string               `json:"scp,omitempty"`
	Custom         map[string]interface{} `json:"-"` // Store all claims
	rawClaims      map[string]interface{} // Internal storage
}

// NewAuthMiddleware creates a new authentication middleware using Okta SDK
func NewAuthMiddleware(config *OktaConfig) (*AuthMiddleware, error) {
	toValidate := map[string]string{}
	toValidate["aud"] = config.ClientID
	toValidate["cid"] = config.ClientID

	jwtVerifierSetup := verifier.JwtVerifier{
		Issuer:           config.Issuer,
		ClaimsToValidate: toValidate,
	}

	return &AuthMiddleware{
		verifier: &jwtVerifierSetup,
		config:   config,
	}, nil
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

		// Verify the token using Okta SDK
		jwt, err := am.verifier.VerifyAccessToken(tokenString)
		if err != nil {
			http.Error(w, fmt.Sprintf("Invalid token: %v", err), http.StatusUnauthorized)
			return
		}

		// Extract claims from the verified JWT
		claims := am.extractClaims(jwt.Claims)

		// Add claims to request context
		ctx := context.WithValue(r.Context(), "claims", claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// extractClaims converts the JWT claims to our Claims struct
func (am *AuthMiddleware) extractClaims(jwtClaims map[string]interface{}) *Claims {
	claims := &Claims{
		rawClaims: jwtClaims,
		Custom:    make(map[string]interface{}),
	}

	// Extract standard claims
	if sub, ok := jwtClaims["sub"].(string); ok {
		claims.Subject = sub
	}

	if email, ok := jwtClaims["email"].(string); ok {
		claims.Email = email
	}

	// WSU-specific claims
	if emailPrimary, ok := jwtClaims["email_primary"].(string); ok {
		claims.EmailPrimary = emailPrimary
	}

	if emailSecondary, ok := jwtClaims["email_secondary"].(string); ok {
		claims.EmailSecondary = emailSecondary
	}

	if wsuid, ok := jwtClaims["WSUID"].(string); ok {
		claims.WSUID = wsuid
	}

	if nid, ok := jwtClaims["NID"].(string); ok {
		claims.NID = nid
	}

	if department, ok := jwtClaims["department"].(string); ok {
		claims.Department = department
	}

	if title, ok := jwtClaims["title"].(string); ok {
		claims.Title = title
	}

	if name, ok := jwtClaims["name"].(string); ok {
		claims.Name = name
	}

	// Extract Okta_Groups (WSU-specific)
	if oktaGroups, ok := jwtClaims["Okta_Groups"].([]interface{}); ok {
		claims.OktaGroups = make([]string, 0, len(oktaGroups))
		for _, g := range oktaGroups {
			if groupStr, ok := g.(string); ok {
				claims.OktaGroups = append(claims.OktaGroups, groupStr)
			}
		}
	}

	// Extract standard groups
	if groups, ok := jwtClaims["groups"].([]interface{}); ok {
		claims.Groups = make([]string, 0, len(groups))
		for _, g := range groups {
			if groupStr, ok := g.(string); ok {
				claims.Groups = append(claims.Groups, groupStr)
			}
		}
	}

	// Extract scopes (can be string or array)
	if scp, ok := jwtClaims["scp"].([]interface{}); ok {
		claims.Scopes = make([]string, 0, len(scp))
		for _, s := range scp {
			if scopeStr, ok := s.(string); ok {
				claims.Scopes = append(claims.Scopes, scopeStr)
			}
		}
	} else if scpStr, ok := jwtClaims["scp"].(string); ok {
		// Sometimes scopes come as space-separated string
		claims.Scopes = strings.Split(scpStr, " ")
	}

	// Store all other claims in Custom map
	standardClaims := map[string]bool{
		"sub": true, "email": true, "email_primary": true, "email_secondary": true,
		"name": true, "WSUID": true, "NID": true, "department": true, "title": true,
		"groups": true, "Okta_Groups": true, "scp": true,
		"iss": true, "aud": true, "exp": true, "iat": true, "jti": true, "cid": true,
		"ver": true, "amr": true, "idp": true, "nonce": true, "auth_time": true, "at_hash": true,
	}

	for key, value := range jwtClaims {
		if !standardClaims[key] {
			claims.Custom[key] = value
		}
	}

	return claims
}

// GetClaimsFromContext extracts claims from the request context
func GetClaimsFromContext(ctx context.Context) (*Claims, bool) {
	claims, ok := ctx.Value("claims").(*Claims)
	return claims, ok
}

// HasScope checks if the user has a specific scope
func (c *Claims) HasScope(scope string) bool {
	for _, s := range c.Scopes {
		if s == scope {
			return true
		}
	}
	return false
}

// HasGroup checks if the user is in a specific group
func (c *Claims) HasGroup(group string) bool {
	for _, g := range c.Groups {
		if g == group {
			return true
		}
	}
	return false
}

// HasOktaGroup checks if the user is in a specific Okta group (WSU-specific)
func (c *Claims) HasOktaGroup(group string) bool {
	for _, g := range c.OktaGroups {
		if g == group {
			return true
		}
	}
	return false
}

// GetCustomClaim retrieves a custom claim by key
func (c *Claims) GetCustomClaim(key string) (interface{}, bool) {
	val, ok := c.Custom[key]
	return val, ok
}

// GetCustomClaimString retrieves a custom claim as a string
func (c *Claims) GetCustomClaimString(key string) (string, bool) {
	val, ok := c.Custom[key]
	if !ok {
		return "", false
	}
	str, ok := val.(string)
	return str, ok
}
