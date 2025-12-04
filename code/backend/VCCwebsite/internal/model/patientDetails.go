package scripts

import "time"

type PatientDetails struct {
	Name              string     `json:"name"`
	BirthYear	  	  int		 `json:"birth_year"`
	BirthMonth		  time.Month `json:"birth_month"`
	BirthDay	  	  int        `json:"birth_day"`
	Age			   	  int        `json:"age"`
	Vitals            VitalSigns `json:"vitals"`
	VisitReason       string     `json:"visit_reason"`
	Context           string     `json:"context"`
	Task              string     `json:"task"`
	EncounterDuration string     `json:"encounter_duration"`
}

func (p *PatientDetails) InitAgeFromDOB(at time.Time) {
	p.Age = calcAge(p.BirthYear, int(p.BirthMonth), p.BirthDay, at)
}

func (p *PatientDetails) RefreshBirthYear(at time.Time) {
	p.BirthYear = DisplayBirthYear(p.Age, at)
}

