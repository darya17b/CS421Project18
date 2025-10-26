package main

import "net/http"
import "VCCwebsite/api"

func main() {
	mux := http.NewServeMux()

	mux.Handle("/", &api.HomePageHandler{})
	http.ListenAndServe(":8080", mux)
}
