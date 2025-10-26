package scripts

type PastMedicalHistory struct {
	ChildHoodIllness   string `json:"child_hood_illness"`
	IllnessAndHospital string `json:"illness_and_hospital"`
	Surgeries          string `json:"surgeries"`
	ObeAndGye          string `json:"obe_and_gye"`
	Transfusion        string `json:"transfusion"`
	Psychiatric        string `json:"psychiatric"`
	Trauma             string `json:"trauma"`
}
