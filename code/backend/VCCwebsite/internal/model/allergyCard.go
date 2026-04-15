package scripts

type AllergyCard struct {
	Allergen string `json:"allergen"`
	Reaction string `json:"reaction,omitempty"`
	Severity string `json:"severity,omitempty"`
	Notes    string `json:"notes,omitempty"`
}
