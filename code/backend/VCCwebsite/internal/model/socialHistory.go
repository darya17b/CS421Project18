package scripts

type SocialHistory struct {
	PersonalBackground     string        `json:"personal_background"`
	NutrionAndExercise     string        `json:"nutrion_and_exercise"`
	CommunityAndEmployment string        `json:"community_and_employment"`
	SafetyMeasure          string        `json:"safety_measure"`
	LifeStressors          string        `json:"life_stressors"`
	SubstanceUse           string        `json:"substance_use"`
	SexHistory             SexualHistory `json:"sex_history"`
}
