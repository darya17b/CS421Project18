package scripts

type ReviewOfSymptoms struct {
	General            string `json:"general"`
	Skin               string `json:"skin"`
	HEENT              string `json:"heent"`
	Neck               string `json:"neck"`
	Breast             string `json:"breast"`
	Respiratory        string `json:"respiratory"`
	Cardiovascular     string `json:"cardiovascular"`
	Gastrointestinal   string `json:"gastrointestinal"`
	PeripheralVascular string `json:"peripheral_vascular"`
	Musculoskeletal    string `json:"musculoskeletal"`
	Psychiatric        string `json:"psychiatric"`
	Neurologival       string `json:"neurologival"`
	Endocine           string `json:"endocine"`
}
