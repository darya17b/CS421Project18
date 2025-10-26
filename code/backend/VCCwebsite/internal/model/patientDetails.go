package scripts

type PatientDetails struct {
	Name              string     `json:"name"`
	Vitals            VitalSigns `json:"vitals"`
	Context           string     `json:"context"`
	Task              string     `json:"task"`
	EncounterDuration string     `json:"encounter_duration"`
}
