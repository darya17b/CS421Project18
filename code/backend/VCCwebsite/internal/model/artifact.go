package scripts

type Artifact struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	ContentType string `json:"content_type"`
	Size        int64  `json:"size"`
	UploadedAt  string `json:"uploaded_at"`
	URL         string `json:"url,omitempty"`
}
