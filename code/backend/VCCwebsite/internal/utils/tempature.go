package Measurements

const CTF float32 = 1.8
const FTC float32 = .55

type tempatureUnit int8

const (
	Celcius tempatureUnit = iota
	Fahrenheit
)

type Tempature struct {
	Reading float32       `json:"reading"`
	Unit    tempatureUnit `json:"unit"`
}

func (t *Tempature) Convert() {
	switch t.Unit {
	case Celcius:
		t.Reading = t.Reading*CTF + 32
		t.Unit = Fahrenheit
	case Fahrenheit:
		t.Reading = (t.Reading - 32) * (FTC)
		t.Unit = Celcius

	}
}
