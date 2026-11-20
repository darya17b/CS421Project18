package auth

import (
	"context"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const TokenTTL = time.Hour

type AuthMiddleware struct {
	secret []byte
}

// Claims describe the authenticated caller. UserID comes from the token; Role
// is loaded from the database on every request, never taken from the token.
type Claims struct {
	UserID int64
	Role   string
}

type jwtClaims struct {
	Role string `json:"role"`
	jwt.RegisteredClaims
}

// NewAuthMiddleware creates the middleware from a plain secret string
func NewAuthMiddleware(secret string) (*AuthMiddleware, error) {
	if secret == "" {
		return nil, errors.New("JWT secret must not be empty")
	}
	return &AuthMiddleware{secret: []byte(secret)}, nil
}

// IssueToken signs a token for the user that expires after TokenTTL. The role
// claim is informational for clients; the server ignores it.
func (am *AuthMiddleware) IssueToken(userID int64, role string) (string, error) {
	now := time.Now()
	claims := jwtClaims{
		Role: role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   strconv.FormatInt(userID, 10),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(TokenTTL)),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(am.secret)
}

// VerifyToken checks the signature and expiry and returns the token's user id.
func (am *AuthMiddleware) VerifyToken(tokenStr string) (userID int64, err error) {
	var c jwtClaims
	_, err = jwt.ParseWithClaims(tokenStr, &c,
		func(*jwt.Token) (any, error) { return am.secret, nil },
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithExpirationRequired(),
	)
	if err != nil {
		return 0, errors.New("invalid or expired token")
	}
	userID, err = strconv.ParseInt(c.Subject, 10, 64)
	if err != nil {
		return 0, errors.New("malformed claims")
	}
	return userID, nil
}

// Middleware validates the Bearer token, then loads the user from the
// database so role changes and deactivation take effect immediately.
func (am *AuthMiddleware) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tokenStr, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
		if !ok || tokenStr == "" {
			http.Error(w, "missing or invalid authorization header", http.StatusUnauthorized)
			return
		}
		userID, err := am.VerifyToken(tokenStr)
		if err != nil {
			http.Error(w, "invalid token", http.StatusUnauthorized)
			return
		}
		role, err := ActiveUserRole(userID)
		if errors.Is(err, ErrUserNotFound) {
			http.Error(w, "invalid token", http.StatusUnauthorized)
			return
		}
		if err != nil {
			log.Printf("load user %d: %v", userID, err)
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}
		claims := &Claims{UserID: userID, Role: role}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), claimsKey, claims)))
	})
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
			if !allowed[claims.Role] {
				http.Error(w, "forbidden", http.StatusForbidden)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// RequireAdmin — chains after Middleware()
func RequireAdmin(next http.Handler) http.Handler {
	return RequireRole("admin")(next)
}

type contextKey string

const claimsKey = contextKey("claims")

func GetClaimsFromContext(ctx context.Context) (*Claims, bool) {
	claims, ok := ctx.Value(claimsKey).(*Claims)
	return claims, ok
}
