package scripts

type ScriptRequest struct {
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
}
