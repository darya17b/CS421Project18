package scripts

type SPinfo struct {
	OpeningStatement    string                `json:"opening_statement"`
	Attributes          emotions              `json:"attributes"`
	PhysicalChars       string                `json:"physical_chars"`
	OtherSPNotes        string                `json:"other_sp_notes,omitempty"`
	SPFeedbackEnabled   bool                  `json:"sp_feedback_enabled,omitempty"`
	CustomFeedbackNotes string                `json:"custom_feedback_notes,omitempty"`
	CurrentIllHistory   PresentIllnessHistory `json:"current_ill_history"`
}
