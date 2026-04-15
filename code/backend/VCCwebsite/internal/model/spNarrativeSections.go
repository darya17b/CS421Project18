package scripts

type DisclosureFramework struct {
	OfferedSpontaneously      string `json:"offered_spontaneously,omitempty"`
	ElicitedGenerallyPrompted string `json:"elicited_generally_prompted,omitempty"`
	HiddenUntilDirectlyAsked  string `json:"hidden_until_directly_asked,omitempty"`
	MustRelayAccurately       string `json:"must_relay_accurately,omitempty"`
}

type CharacterAttributes struct {
	Anxiety       string `json:"anxiety,omitempty"`
	Suprise       string `json:"suprise,omitempty"`
	Confusion     string `json:"confusion,omitempty"`
	Guilt         string `json:"guilt,omitempty"`
	Sadness       string `json:"sadness,omitempty"`
	Indecision    string `json:"indecision,omitempty"`
	Assertiveness string `json:"assertiveness,omitempty"`
	Frustration   string `json:"frustration,omitempty"`
	Fear          string `json:"fear,omitempty"`
	Anger         string `json:"anger,omitempty"`
}

type PresentationBehaviors struct {
	Affect           string `json:"affect,omitempty"`
	BodyLanguage     string `json:"body_language,omitempty"`
	FacialExpression string `json:"facial_expression,omitempty"`
	EyeContact       string `json:"eye_contact,omitempty"`
	Speech           string `json:"speech,omitempty"`
	Note             string `json:"note,omitempty"`
}

type GenderIdentityExpression struct {
	Pronouns           string `json:"pronouns,omitempty"`
	IdentifiesAs       string `json:"identifies_as,omitempty"`
	SexAssignedAtBirth string `json:"sex_assigned_at_birth,omitempty"`
	GenderPresentation string `json:"gender_presentation,omitempty"`
}
