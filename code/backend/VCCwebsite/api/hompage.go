package api

import "net/http"

type HomePageHandler struct{}

func (h *HomePageHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("this is a test"))
}
