package scripts

type PresentIllnessHistory struct {
	BodyLocation        string `json:"body_location"`
	SymptomSettings     string `json:"symptom_settings"`
	SymptomTiming       string `json:"symptom_timing"`
	AssociatedSymptoms  string `json:"associated_symptoms"`
	RadiationOfSymptoms string `json:"radiation_of_symptoms"`
	SymptomQuality      string `json:"symptom_quality"`
	AlleviatingFactors  string `json:"alleviating_factors"`
	AggravatingFactors  string `json:"aggravating_factors"`
	Pain                uint8  `json:"pain"`
}
