package scripts

import "VCCwebsite/internal/utils"

type VitalSigns struct {
	HeartRate    int16                  `json:"heart_rate"`
	Respirations int16                  `json:"respirations"`
	Pressure     bloodPressure          `json:"pressure"`
	BloodOxygen  int16                  `json:"blood_oxygen"`
	Temp         Measurements.Tempature `json:"temp"`
}
type bloodPressure struct {
	Top    int16 `json:"top"`
	Bottom int16 `json:"bottom"`
}
