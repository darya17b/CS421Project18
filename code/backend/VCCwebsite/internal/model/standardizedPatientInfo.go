package scripts

type SPinfo struct {
	OpeningStatement         string                   `json:"opening_statement"`
	Attributes               emotions                 `json:"attributes"`
	PhysicalChars            string                   `json:"physical_chars"`
	DisclosureFramework      DisclosureFramework      `json:"disclosure_framework,omitempty"`
	CharacterAttributes      CharacterAttributes      `json:"character_attributes,omitempty"`
	PresentationBehaviors    PresentationBehaviors    `json:"presentation_behaviors,omitempty"`
	GenderIdentityExpression GenderIdentityExpression `json:"gender_identity_expression,omitempty"`
	OtherSPNotes             string                   `json:"other_sp_notes,omitempty"`
	SPFeedbackEnabled        bool                     `json:"sp_feedback_enabled,omitempty"`
	CustomFeedbackNotes      string                   `json:"custom_feedback_notes,omitempty"`
	CurrentIllHistory        PresentIllnessHistory    `json:"current_ill_history"`
}
