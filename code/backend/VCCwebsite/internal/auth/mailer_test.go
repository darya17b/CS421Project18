package auth

import (
	"bytes"
	"log"
	"os"
	"strings"
	"testing"
)

func TestLogMailerWritesToLog(t *testing.T) {
	var buf bytes.Buffer
	log.SetOutput(&buf)
	t.Cleanup(func() { log.SetOutput(os.Stderr) })

	if err := (LogMailer{}).Send("admin@example.com", "Hello", "the body"); err != nil {
		t.Fatal(err)
	}
	out := buf.String()
	for _, want := range []string{"admin@example.com", "Hello", "the body"} {
		if !strings.Contains(out, want) {
			t.Errorf("log output missing %q: %s", want, out)
		}
	}
}
