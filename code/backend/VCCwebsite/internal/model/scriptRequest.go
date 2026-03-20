package scripts

type ScriptRequest struct {
	ReasonForVisit         string              `json:"reason_for_visit"`
	SimulationModal        string           `json:"simulation_modal"`
	CaseSetting            string           `json:"case_setting"`
	ChiefConcern           string           `json:"chief_concern"`
	Diagnosis              string           `json:"diagnosis"`
	Event                  string           `json:"event"`
	Pedagogy               string           `json:"pedagogy"`
	Class                  string           `json:"class"`
	LearnerLevel           string           `json:"learner_level"`
	SummaryPatientStory    string           `json:"summary_patient_story"`
	PertAspectsPatientCase string           `json:"pert_aspects_patient_case"`
	PhysicalChars          string           `json:"physical_chars"`
	StudentExpec           string           `json:"student_expec"`
	SpecPhyisFindings      string           `json:"spec_phyis_findings"`
	PatientDemog           string           `json:"patient_demog"`
	SpecialNeeds           string           `json:"special_needs"`
	CaseFactors            string           `json:"case_factors"`
	AdditonalIns           string           `json:"additonal_ins"`
	SymptReview            ReviewOfSymptoms `json:"sympt_review"`
	Status                 string              `json:"status"`
	Note                   string              `json:"note"`
	ApprovedScriptID       string              `json:"approved_script_id"`
	CreatedAt              string              `json:"created_at"`
	UpdatedAt              string              `json:"updated_at"`
	DraftScript            *StandardizedScript `json:"draft_script,omitempty"`
	Artifacts              []Artifact          `json:"artifacts,omitempty"`
}
