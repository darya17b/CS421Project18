package scripts

type PatientDetails struct {
	Name                     string     `json:"name"`
	DateOfBirth              string     `json:"date_of_birth,omitempty"`
	Vitals                   VitalSigns `json:"vitals"`
	VisitReason              string     `json:"visit_reason"`
	VitalsIncludedOnDoorNote *bool      `json:"vitals_included_on_door_note,omitempty"`
	Context                  string     `json:"context"`
	Task                     string     `json:"task"`
	EncounterDuration        string     `json:"encounter_duration"`
}
