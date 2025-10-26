package scripts

type AdminDetails struct {
	ResonForVisit       string `json:"reson_for_visit"`
	ChiefConcern        string `json:"chief_concern"`
	Diagnosis           string `json:"diagnosis"`
	Class               string `json:"class"`
	MedicalEvent        string `json:"medical_event"`
	EventDates          string `json:"event_dates"`
	LearnerLevel        string `json:"learner_level"`
	AcademicYear        string `json:"academic_year"`
	Author              string `json:"author"`
	SummoryOfStory      string `json:"summory_of_story"`
	StudentExpectations string `json:"student_expectations"`
	PatientDemographic  string `json:"patient_demographic"`
	SpecialSupplies     string `json:"special_supplies"`
	CaseFactors         string `json:"case_factors"`
}
