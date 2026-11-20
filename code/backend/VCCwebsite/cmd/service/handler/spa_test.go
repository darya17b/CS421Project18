package handler

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestSPASetPasswordNoReferrer(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "index.html"), []byte("<html></html>"), 0o644); err != nil {
		t.Fatal(err)
	}
	h := SPAHandler{StaticPath: dir, IndexPath: "index.html"}

	for path, want := range map[string]string{
		"/set-password":           "no-referrer",
		"/set-password?token=abc": "no-referrer",
		"/login":                  "",
		"/":                       "",
	} {
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))
		if rec.Code != http.StatusOK {
			t.Errorf("%s: status = %d", path, rec.Code)
		}
		if got := rec.Header().Get("Referrer-Policy"); got != want {
			t.Errorf("%s: Referrer-Policy = %q, want %q", path, got, want)
		}
	}
}
