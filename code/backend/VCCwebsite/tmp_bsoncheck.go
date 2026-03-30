package main

import (
    "fmt"
    "go.mongodb.org/mongo-driver/bson"
)

type Inner struct { Val string `json:"val"` }
type T struct { DraftVersions []Inner `json:"draft_versions,omitempty"`; ApprovedScriptID string `json:"approved_script_id"` }

func main() {
    raw := bson.M{"draft_versions": []bson.M{{"val":"x"}}, "approved_script_id":"abc"}
    b, _ := bson.Marshal(raw)
    var t T
    err := bson.Unmarshal(b, &t)
    fmt.Printf("err=%v t=%+v\n", err, t)
}
