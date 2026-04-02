package scripts

type SocialSupport struct {
	FamilyFriends              string `json:"family_friends"`
	Financial                  string `json:"financial"`
	HealthcareAccessInsurance  string `json:"healthcare_access_insurance"`
	ReligiousOrCommunityGroups string `json:"religious_or_community_groups"`
}

type SocialHistory struct {
	PersonalBackground     string        `json:"personal_background"`
	NutrionAndExercise     string        `json:"nutrion_and_exercise"`
	CommunityAndEmployment string        `json:"community_and_employment"`
	SafetyMeasure          string        `json:"safety_measure"`
	LifeStressors          string        `json:"life_stressors"`
	SocialSupport          SocialSupport `json:"social_support"`
	SubstanceUse           string        `json:"substance_use"`
	SexHistory             SexualHistory `json:"sex_history"`
	SexualHistoryEntries   []string      `json:"sexual_history_entries,omitempty"`
}
