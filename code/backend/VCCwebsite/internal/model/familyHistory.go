package scripts

type FamilyHistory struct {
	HealthStatus  string `json:"health_status"`
	Age           uint8  `json:"age"`
	CauseOfDeath  string `json:"cause_of_death"`
	AdditonalInfo string `json:"additonal_info"`
}
