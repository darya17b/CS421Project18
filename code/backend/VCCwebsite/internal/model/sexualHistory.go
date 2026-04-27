package scripts

type SexualHistory struct {
	CurrentPartners   string `json:"current_partners"`
	PastPartners      string `json:"past_partners"`
	LifetimePartners  string `json:"lifetime_partners,omitempty"`
	OtherDetails      string `json:"other_details,omitempty"`
	Contraceptives    string `json:"contraceptives"`
	HIVRiskHistory    string `json:"hiv_risk_history"`
	SafetyInRelations string `json:"safety_in_relations"`
}
