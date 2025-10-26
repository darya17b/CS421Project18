package scripts

type MedicalHistory struct {
	Medications         MedicationCard       `json:"medications"`
	Allergies           string               `json:"allergies"`
	PastMedHis          PastMedicalHistory   `json:"past_med_his"`
	PreventativeMeasure PreventativeMedicine `json:"preventative_measure"`
	FamilyHist          FamilyHistory        `json:"family_hist"`
	SocialHist          SocialHistory        `json:"social_hist"`
	SymptonReview       ReviewOfSymptoms     `json:"sympton_review"`
}
