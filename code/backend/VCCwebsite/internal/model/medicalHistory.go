package scripts

type MedicalHistory struct {
	Medications                []MedicationCard     `json:"medications"`
	NonPrescriptionMedications []string             `json:"non_prescription_medications,omitempty"`
	AllergiesList              []string             `json:"allergies_list,omitempty"`
	Allergies                  string               `json:"allergies"`
	PastMedHis                 PastMedicalHistory   `json:"past_med_his"`
	PreventativeMeasure        PreventativeMedicine `json:"preventative_measure"`
	FamilyHist                 []FamilyHistory      `json:"family_hist"`
	SocialHist                 SocialHistory        `json:"social_hist"`
	SymptonReview              ReviewOfSymptoms     `json:"sympton_review"`
}
