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
	top    int16 `json:"top"`
	bottom int16 `json:"bottom"`
}
