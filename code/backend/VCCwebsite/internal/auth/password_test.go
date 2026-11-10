package auth

import "testing"

func TestHashAndCheckPassword(t *testing.T) {
	hash, err := HashPassword("correct horse")
	if err != nil {
		t.Fatal(err)
	}
	if hash == "correct horse" {
		t.Fatal("hash equals plaintext")
	}
	if !CheckPassword(hash, "correct horse") {
		t.Error("correct password rejected")
	}
	if CheckPassword(hash, "wrong horse") {
		t.Error("wrong password accepted")
	}

	again, _ := HashPassword("correct horse")
	if again == hash {
		t.Error("hashes should be salted and differ")
	}
}
