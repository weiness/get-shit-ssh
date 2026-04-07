package ssh_test

import (
	"strings"
	"testing"

	"gss/internal/ssh"
)

func TestGenerateKey_Ed25519(t *testing.T) {
	pub, priv, err := ssh.GenerateKey("ed25519")
	if err != nil {
		t.Fatalf("GenerateKey ed25519: %v", err)
	}
	if !strings.HasPrefix(pub, "ssh-ed25519 ") {
		t.Fatalf("unexpected public key prefix: %s", pub[:min(30, len(pub))])
	}
	if !strings.Contains(string(priv), "OPENSSH PRIVATE KEY") {
		t.Fatal("private key PEM does not contain OPENSSH PRIVATE KEY header")
	}
}

func TestGenerateKey_ECDSA(t *testing.T) {
	pub, priv, err := ssh.GenerateKey("ecdsa")
	if err != nil {
		t.Fatalf("GenerateKey ecdsa: %v", err)
	}
	if !strings.HasPrefix(pub, "ecdsa-sha2-nistp256 ") {
		t.Fatalf("unexpected public key prefix: %s", pub[:min(40, len(pub))])
	}
	if !strings.Contains(string(priv), "OPENSSH PRIVATE KEY") {
		t.Fatal("private key PEM does not contain OPENSSH PRIVATE KEY header")
	}
}

func TestGenerateKey_Unsupported(t *testing.T) {
	_, _, err := ssh.GenerateKey("rsa")
	if err == nil {
		t.Fatal("expected error for unsupported algorithm")
	}
}

func TestImportKey_Ed25519(t *testing.T) {
	_, origPEM, err := ssh.GenerateKey("ed25519")
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}

	pub, privPEM, err := ssh.ImportKey(origPEM)
	if err != nil {
		t.Fatalf("ImportKey: %v", err)
	}
	if !strings.HasPrefix(pub, "ssh-ed25519 ") {
		t.Fatalf("unexpected public key: %s", pub)
	}
	if len(privPEM) == 0 {
		t.Fatal("private key PEM is empty")
	}
}

func TestImportKey_ECDSA(t *testing.T) {
	_, origPEM, err := ssh.GenerateKey("ecdsa")
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}

	pub, _, err := ssh.ImportKey(origPEM)
	if err != nil {
		t.Fatalf("ImportKey: %v", err)
	}
	if !strings.HasPrefix(pub, "ecdsa-sha2-nistp256 ") {
		t.Fatalf("unexpected public key: %s", pub)
	}
}

func TestImportKey_Invalid(t *testing.T) {
	_, _, err := ssh.ImportKey([]byte("not a valid PEM"))
	if err == nil {
		t.Fatal("expected error for invalid PEM")
	}
}

func TestGenerateKey_PublicKeyUnique(t *testing.T) {
	pub1, _, _ := ssh.GenerateKey("ed25519")
	pub2, _, _ := ssh.GenerateKey("ed25519")
	if pub1 == pub2 {
		t.Fatal("generated keys are not unique")
	}
}

func TestImportKey_RoundTrip(t *testing.T) {
	// Generate, import, and check public keys match
	origPub, origPEM, err := ssh.GenerateKey("ed25519")
	if err != nil {
		t.Fatalf("generate: %v", err)
	}
	importedPub, _, err := ssh.ImportKey(origPEM)
	if err != nil {
		t.Fatalf("import: %v", err)
	}
	if strings.TrimSpace(origPub) != strings.TrimSpace(importedPub) {
		t.Fatalf("public key mismatch:\norig:     %s\nimported: %s", origPub, importedPub)
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
