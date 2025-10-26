package scripts

type SPinfo struct {
	OpeningStatement  string                `json:"opening_statement"`
	Attributes        emotions              `json:"attributes"`
	PhysicalChars     string                `json:"physical_chars"`
	CurrentIllHistory PresentIllnessHistory `json:"current_ill_history"`
}
