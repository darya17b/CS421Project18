package auth

import "log"

type Mailer interface {
	Send(to, subject, body string) error
}

// LogMailer prints emails to the console instead of sending them.
type LogMailer struct{}

func (LogMailer) Send(to, subject, body string) error {
	log.Printf("email to=%s subject=%q\n%s", to, subject, body)
	return nil
}
