package auth

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type AuthMiddleware struct {
	secret []byte
}

type Claims struct {
	Subject string                 `json:"sub"`
	Email   string                 `json:"email,omitempty"`
	Groups  []string               `json:"groups,omitempty"`
	Scopes  []string               `json:"scp,omitempty"`
	Custom  map[string]interface{} `json:"-"`
}

type jwtClaims struct {
	Subject string   `json:"sub"`
	Email   string   `json:"email,omitempty"`
	Groups  []string `json:"groups,omitempty"`
	Scopes  []string `json:"scp,omitempty"`
	Role    string   `json:"role,omitempty"`
	jwt.RegisteredClaims
}

// NewAuthMiddleware creates the middleware from a plain secret string
func NewAuthMiddleware(secret string) (*AuthMiddleware, error) {
	if secret == "" {
		return nil, errors.New("JWT secret must not be empty")
	}
	return &AuthMiddleware{secret: []byte(secret)}, nil
}

// GenerateToken is a package-level helper used by the login handler in main.go
func GenerateToken(secret string, c *Claims, role string, ttl time.Duration) (string, error) {
	inner := &jwtClaims{
		Subject: c.Subject,
		Email:   c.Email,
		Groups:  c.Groups,
		Scopes:  c.Scopes,
		Role:    role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   c.Subject,
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(ttl)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, inner).SignedString([]byte(secret))
}

// Middleware validates the Bearer token on incoming requests
func (am *AuthMiddleware) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		header := r.Header.Get("Authorization")
		if header == "" {
			http.Error(w, "missing authorization header", http.StatusUnauthorized)
			return
		}
		parts := strings.Split(header, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			http.Error(w, "invalid authorization header format", http.StatusUnauthorized)
			return
		}
		claims, err := am.verify(parts[1])
		if err != nil {
			http.Error(w, "invalid token: "+err.Error(), http.StatusUnauthorized)
			return
		}
		ctx := context.WithValue(r.Context(), contextKey("claims"), claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (am *AuthMiddleware) verify(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &jwtClaims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return am.secret, nil
	})
	if err != nil || !token.Valid {
		return nil, errors.New("invalid or expired token")
	}
	inner, ok := token.Claims.(*jwtClaims)
	if !ok {
		return nil, errors.New("malformed claims")
	}
	return &Claims{
		Subject: inner.Subject,
		Email:   inner.Email,
		Groups:  inner.Groups,
		Scopes:  inner.Scopes,
		Custom:  map[string]interface{}{"role": inner.Role},
	}, nil
}

// RequireRole middleware — chains after Middleware()
func RequireRole(roles ...string) func(http.Handler) http.Handler {
	allowed := make(map[string]bool, len(roles))
	for _, r := range roles {
		allowed[r] = true
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := GetClaimsFromContext(r.Context())
			if !ok {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}
			role, _ := claims.GetCustomClaimString("role")
			if !allowed[role] {
				http.Error(w, "forbidden", http.StatusForbidden)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

type contextKey string

func GetClaimsFromContext(ctx context.Context) (*Claims, bool) {
	claims, ok := ctx.Value(contextKey("claims")).(*Claims)
	return claims, ok
}

func (c *Claims) HasScope(scope string) bool {
	for _, s := range c.Scopes {
		if s == scope {
			return true
		}
	}
	return false
}

func (c *Claims) HasGroup(group string) bool {
	for _, g := range c.Groups {
		if g == group {
			return true
		}
	}
	return false
}

func (c *Claims) GetCustomClaim(key string) (interface{}, bool) {
	val, ok := c.Custom[key]
	return val, ok
}

func (c *Claims) GetCustomClaimString(key string) (string, bool) {
	val, ok := c.Custom[key]
	if !ok {
		return "", false
	}
	str, ok := val.(string)
	return str, ok
}
