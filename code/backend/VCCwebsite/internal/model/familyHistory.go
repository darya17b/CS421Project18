package scripts

type FamilyHistory struct {
	FamilyMember      string   `json:"family_member,omitempty"`
	AgeText           string   `json:"age_text,omitempty"`
	Details           string   `json:"details,omitempty"`
	AdditionalDetails []string `json:"additional_details,omitempty"`
	HealthStatus      string   `json:"health_status"`
	Relation          string   `json:"relation,omitempty"`
	Status            string   `json:"status,omitempty"`
	Conditions        string   `json:"conditions,omitempty"`
	Notes             string   `json:"notes,omitempty"`
	Age               uint8    `json:"age"`
	CauseOfDeath      string   `json:"cause_of_death"`
	AdditonalInfo     string   `json:"additonal_info"`
}
