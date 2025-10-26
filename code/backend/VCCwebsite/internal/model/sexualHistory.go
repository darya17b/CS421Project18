package scripts

type SexualHistory struct {
	CurrentPartners   uint32 `json:"current_partners"`
	PastPartners      uint32 `json:"past_partners"`
	Contraceptives    string `json:"contraceptives"`
	HIVRiskHistory    string `json:"hiv_risk_history"`
	SafetyInRelations string `json:"safety_in_relations"`
}
