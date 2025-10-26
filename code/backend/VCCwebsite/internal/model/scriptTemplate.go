package scripts

type StandardizedScript struct {
	Admin   AdminDetails        `json:"admin"`
	Patient PatientDetails      `json:"patient"`
	SP      SPinfo              `json:"sp"`
	MedHist MedicalHistory      `json:"med_hist"`
	Special SpecialInstructions `json:"special"`
}
