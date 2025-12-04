package scripts


type Contact struct {
	Name string `json:"name" bson:"name"`
	Email string `json:"email" bson: "email"`
	Characters []string `json:"characters" bson:"characters"`
}