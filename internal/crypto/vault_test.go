package crypto_test

import (
	"testing"

	"gss/internal/crypto"
)

func TestEncryptDecrypt(t *testing.T) {
	key := make([]byte, 32) // 全零密钥，仅用于测试
	plaintext := []byte("super-secret-password")

	ciphertext, err := crypto.Encrypt(key, plaintext)
	if err != nil {
		t.Fatalf("Encrypt failed: %v", err)
	}
	if len(ciphertext) == 0 {
		t.Fatal("ciphertext is empty")
	}

	decrypted, err := crypto.Decrypt(key, ciphertext)
	if err != nil {
		t.Fatalf("Decrypt failed: %v", err)
	}
	if string(decrypted) != string(plaintext) {
		t.Fatalf("expected %q, got %q", plaintext, decrypted)
	}
}

func TestDecryptWrongKey(t *testing.T) {
	key := make([]byte, 32)
	wrongKey := make([]byte, 32)
	wrongKey[0] = 0xFF

	ciphertext, _ := crypto.Encrypt(key, []byte("secret"))
	_, err := crypto.Decrypt(wrongKey, ciphertext)
	if err == nil {
		t.Fatal("expected error with wrong key, got nil")
	}
}
