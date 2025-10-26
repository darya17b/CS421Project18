package scripts

type MedicationCard struct {
	Name       string `json:"name"`
	Brand      string `json:"brand"`
	Generic    string `json:"generic"`
	Dose       string `json:"dose"`
	Frequency  string `json:"frequency"`
	Reason     string `json:"reason"`
	StartDate  string `json:"startDate"`
	OtherNotes string `json:"otherNotes"`
}
