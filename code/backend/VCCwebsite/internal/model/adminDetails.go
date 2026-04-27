package scripts

type AdminDetails struct {
	ResonForVisit              string `json:"reson_for_visit"`
	ChiefConcern               string `json:"chief_concern"`
	Diagnosis                  string `json:"diagnosis"`
	AbbreviatedDiagnosis       string `json:"abbreviated_diagnosis,omitempty"`
	ICD10Code                  string `json:"icd10_code,omitempty"`
	CaseSetting                string `json:"case_setting,omitempty"`
	CaseType                   string `json:"case_type,omitempty"`
	CaseLetter                 string `json:"case_letter,omitempty"`
	CaseAuthors                string `json:"case_authors,omitempty"`
	Class                      string `json:"class"`
	MedicalEvent               string `json:"medical_event"`
	EventDates                 string `json:"event_dates"`
	LearnerLevel               string `json:"learner_level"`
	AcademicYear               string `json:"academic_year"`
	Author                     string `json:"author"`
	SummoryOfStory             string `json:"summory_of_story"`
	StudentExpectations        string `json:"student_expectations"`
	LearningObjectives         string `json:"learning_objectives,omitempty"`
	PatientDemographic         string `json:"patient_demographic"`
	StaffRoomSetupInstructions string `json:"staff_room_setup_instructions,omitempty"`
	ContentWarning             string `json:"content_warning,omitempty"`
	SpecialSupplies            string `json:"special_supplies"`
	CaseFactors                string `json:"case_factors"`
	PhysicalExamination        string `json:"physical_examination,omitempty"`
	FinalPageNotes             string `json:"final_page_notes,omitempty"`
}
