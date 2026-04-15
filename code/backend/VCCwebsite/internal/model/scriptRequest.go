package scripts

type ScriptRequestDraftVersion struct {
	Version   string              `json:"version"`
	Notes     string              `json:"notes,omitempty"`
	Fields    *StandardizedScript `json:"fields,omitempty"`
	CreatedAt string              `json:"created_at,omitempty"`
}

type ScriptRequest struct {
	ReasonForVisit             string                      `json:"reason_for_visit"`
	SimulationModal            string                      `json:"simulation_modal"`
	CaseType                   string                      `json:"case_type,omitempty"`
	CaseSetting                string                      `json:"case_setting"`
	ChiefConcern               string                      `json:"chief_concern"`
	Diagnosis                  string                      `json:"diagnosis"`
	AbbreviatedDiagnosis       string                      `json:"abbreviated_diagnosis,omitempty"`
	ICD10Code                  string                      `json:"icd10_code,omitempty"`
	Event                      string                      `json:"event"`
	Pedagogy                   string                      `json:"pedagogy"`
	Class                      string                      `json:"class"`
	LearnerLevel               string                      `json:"learner_level"`
	SummaryPatientStory        string                      `json:"summary_patient_story"`
	PertAspectsPatientCase     string                      `json:"pert_aspects_patient_case"`
	PhysicalChars              string                      `json:"physical_chars"`
	StudentExpec               string                      `json:"student_expec"`
	LearningObjectives         string                      `json:"learning_objectives,omitempty"`
	SpecPhyisFindings          string                      `json:"spec_phyis_findings"`
	PatientDemog               string                      `json:"patient_demog"`
	VitalsIncludedOnDoorNote   *bool                       `json:"vitals_included_on_door_note,omitempty"`
	StaffRoomSetupInstructions string                      `json:"staff_room_setup_instructions,omitempty"`
	ContentWarning             string                      `json:"content_warning,omitempty"`
	SpecialNeeds               string                      `json:"special_needs"`
	CaseFactors                string                      `json:"case_factors"`
	AdditonalIns               string                      `json:"additonal_ins"`
	FinalPageNotes             string                      `json:"final_page_notes,omitempty"`
	OtherSPNotes               string                      `json:"other_sp_notes,omitempty"`
	SPFeedbackEnabled          bool                        `json:"sp_feedback_enabled,omitempty"`
	CustomFeedbackNotes        string                      `json:"custom_feedback_notes,omitempty"`
	SymptReview                ReviewOfSymptoms            `json:"sympt_review"`
	Status                     string                      `json:"status"`
	Note                       string                      `json:"note"`
	ApprovedScriptID           string                      `json:"approved_script_id"`
	PublishedScriptID          string                      `json:"published_script_id,omitempty"`
	CreatedAt                  string                      `json:"created_at"`
	UpdatedAt                  string                      `json:"updated_at"`
	DraftScript                *StandardizedScript         `json:"draft_script,omitempty"`
	DraftVersions              []ScriptRequestDraftVersion `json:"draft_versions,omitempty"`
	Artifacts                  []Artifact                  `json:"artifacts,omitempty"`
}
