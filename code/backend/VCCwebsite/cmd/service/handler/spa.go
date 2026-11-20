package handler

import (
	"net/http"
	"os"
	"path/filepath"
)

type SPAHandler struct {
	StaticPath string
	IndexPath  string
}

func (h SPAHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// The set-password URL carries a one-time token; keep it out of Referer
	// headers from the very first request the page makes.
	if r.URL.Path == "/set-password" {
		w.Header().Set("Referrer-Policy", "no-referrer")
	}
	path := filepath.Join(h.StaticPath, r.URL.Path)
	fi, err := os.Stat(path)
	if os.IsNotExist(err) || fi.IsDir() {
		http.ServeFile(w, r, filepath.Join(h.StaticPath, h.IndexPath))
		return
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	http.FileServer(http.Dir(h.StaticPath)).ServeHTTP(w, r)
}
