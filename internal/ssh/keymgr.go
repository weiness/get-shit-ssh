package ssh

import (
	"crypto"
	"crypto/ecdsa"
	"crypto/ed25519"
	"crypto/elliptic"
	"crypto/rand"
	"encoding/pem"
	"fmt"

	gossh "golang.org/x/crypto/ssh"
)

// GenerateKey generates an SSH key pair for the given algorithm.
// algorithm must be "ed25519" or "ecdsa".
// Returns the public key in OpenSSH authorized_keys format and the private key PEM bytes.
func GenerateKey(algorithm string) (publicKey string, privateKeyPEM []byte, err error) {
	switch algorithm {
	case "ed25519":
		_, priv, e := ed25519.GenerateKey(rand.Reader)
		if e != nil {
			return "", nil, fmt.Errorf("generate ed25519: %w", e)
		}
		return marshalKeyPair(priv)
	case "ecdsa":
		priv, e := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
		if e != nil {
			return "", nil, fmt.Errorf("generate ecdsa: %w", e)
		}
		return marshalKeyPair(priv)
	default:
		return "", nil, fmt.Errorf("unsupported algorithm %q (use ed25519 or ecdsa)", algorithm)
	}
}

// ImportKey validates a PEM-encoded SSH private key and returns its public key
// in authorized_keys format and the normalized private key PEM bytes.
func ImportKey(pemData []byte) (publicKey string, privateKeyPEM []byte, err error) {
	raw, err := gossh.ParseRawPrivateKey(pemData)
	if err != nil {
		return "", nil, fmt.Errorf("parse private key: %w", err)
	}
	return marshalKeyPair(raw.(crypto.PrivateKey))
}

// marshalKeyPair encodes a private key to OpenSSH PEM and extracts the public key string.
func marshalKeyPair(priv crypto.PrivateKey) (publicKey string, privateKeyPEM []byte, err error) {
	signer, err := gossh.NewSignerFromKey(priv)
	if err != nil {
		return "", nil, fmt.Errorf("create signer: %w", err)
	}

	pubKey := string(gossh.MarshalAuthorizedKey(signer.PublicKey()))

	pemBlock, err := gossh.MarshalPrivateKey(priv, "")
	if err != nil {
		return "", nil, fmt.Errorf("marshal private key: %w", err)
	}

	return pubKey, pem.EncodeToMemory(pemBlock), nil
}
