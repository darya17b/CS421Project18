package scripts

type PatientDetails struct {
	Name              string     `json:"name"`
	Vitals            VitalSigns `json:"vitals"`
	VisitReason       string     `json:"visit_reason"`
	Context           string     `json:"context"`
	Task              string     `json:"task"`
	EncounterDuration string     `json:"encounter_duration"`
}
