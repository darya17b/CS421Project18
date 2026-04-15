package scripts

type ObstetricGynecologicHistory struct {
	MenstrualHistory           string `json:"menstrual_history,omitempty"`
	LMP                        string `json:"lmp,omitempty"`
	LMPDetails                 string `json:"lmp_details,omitempty"`
	Pregnancies                int    `json:"pregnancies"`
	Births                     int    `json:"births"`
	PregnancyBirthsExplanation string `json:"pregnancy_births_explanation,omitempty"`
}
