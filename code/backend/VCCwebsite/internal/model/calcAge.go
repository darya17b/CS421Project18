package scripts

import "time"

func calcAge(year, month, day int, at time.Time) int {
	dob := time.Date(year, time.Month(month), day, 0, 0, 0, 0, time.UTC)
	age := at.Year() - dob.Year()
	if at.Month() < dob.Month() || (at.Month() == dob.Month() && at.Day() < dob.Day()) {
		age--
	}
	return age
}

func DisplayBirthYear(age int, at time.Time) int{
	return at.Year() - age
}