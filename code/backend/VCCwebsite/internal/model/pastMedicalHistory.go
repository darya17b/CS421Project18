package scripts

type PastMedicalHistory struct {
	ChildHoodIllness     string                      `json:"child_hood_illness"`
	Trauma               string                      `json:"trauma"`
	IllnessAndHospital   string                      `json:"illness_and_hospital"`
	Surgeries            string                      `json:"surgeries"`
	ObstetricGynecologic ObstetricGynecologicHistory `json:"obstetric_gynecologic,omitempty"`
	ObeAndGye            string                      `json:"obe_and_gye"`
	Transfusion          string                      `json:"transfusion"`
	Psychiatric          string                      `json:"psychiatric"`
}
