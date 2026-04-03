package ssh_test

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"errors"
	"fmt"
	"net"
	"testing"

	gossh "golang.org/x/crypto/ssh"

	"gss/internal/crypto"
	"gss/internal/ssh"
	"gss/internal/store"
)

// newTestHost creates a Host for testing with either password or key auth
func newTestHost(id, username, password string, authType string) *store.Host {
	h := &store.Host{
		ID:        id,
		Name:      "test-host",
		Host:      "localhost:2222",
		Port:      2222,
		Username:  username,
		AuthType:  authType,
		CreatedAt: 0,
		UpdatedAt: 0,
	}
	return h
}

// encryptSecret encrypts a secret (password or private key) with the given key
func encryptSecret(t *testing.T, encKey []byte, plain []byte) []byte {
	cipher, err := crypto.Encrypt(encKey, plain)
	if err != nil {
		t.Fatalf("failed to encrypt secret: %v", err)
	}
	return cipher
}

// newTestSSHServer starts a simple SSH server for testing and returns the address and cleanup function
// It supports password authentication only
func newTestSSHServer(t *testing.T, password string) (addr string, cleanup func()) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("failed to listen: %v", err)
	}

	addr = listener.Addr().String()

	// Generate SSH host key (ECDSA P-256)
	privateKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatalf("failed to generate ECDSA key: %v", err)
	}

	hostKey, err := gossh.NewSignerFromKey(privateKey)
	if err != nil {
		t.Fatalf("failed to create signer: %v", err)
	}

	// SSH server config
	config := &gossh.ServerConfig{
		PasswordCallback: func(conn gossh.ConnMetadata, pass []byte) (*gossh.Permissions, error) {
			if string(pass) == password {
				return &gossh.Permissions{}, nil
			}
			return nil, errors.New("authentication failed")
		},
	}
	config.AddHostKey(hostKey)

	// Run server in background goroutine
	go func() {
		for {
			conn, err := listener.Accept()
			if err != nil {
				return
			}
			_, _, _, err = gossh.NewServerConn(conn, config)
			if err != nil {
				conn.Close()
			}
		}
	}()

	cleanup = func() {
		listener.Close()
	}

	return addr, cleanup
}

// TestManager_ConnectPassword tests connecting with password authentication
func TestManager_ConnectPassword(t *testing.T) {
	encKey := make([]byte, 32) // all-zero key for testing
	password := "test-password-123"

	addr, cleanup := newTestSSHServer(t, password)
	defer cleanup()

	// Create test host
	host := newTestHost("host-1", "testuser", password, "password")
	// addr is in format "127.0.0.1:12345", we need to split it for host/port
	h, p, err := net.SplitHostPort(addr)
	if err == nil {
		host.Host = h
		_, _ = fmt.Sscanf(p, "%d", &host.Port)
	}
	host.Secret = encryptSecret(t, encKey, []byte(password))

	// Connect
	mgr := ssh.NewManager(encKey)
	defer mgr.CloseAll()

	sessionID, err := mgr.Connect(host)
	if err != nil {
		t.Fatalf("Connect failed: %v", err)
	}

	if sessionID == "" {
		t.Fatal("sessionID is empty")
	}

	// Verify session exists
	_, ok := mgr.Get(sessionID)
	if !ok {
		t.Fatal("session not found in manager")
	}
}

// TestManager_ConnectWrongPassword tests connection failure with wrong password
func TestManager_ConnectWrongPassword(t *testing.T) {
	encKey := make([]byte, 32)
	correctPassword := "correct-pass"
	wrongPassword := "wrong-pass"

	addr, cleanup := newTestSSHServer(t, correctPassword)
	defer cleanup()

	host := newTestHost("host-2", "testuser", wrongPassword, "password")
	h, p, err := net.SplitHostPort(addr)
	if err == nil {
		host.Host = h
		_, _ = fmt.Sscanf(p, "%d", &host.Port)
	}
	host.Secret = encryptSecret(t, encKey, []byte(wrongPassword))

	mgr := ssh.NewManager(encKey)
	defer mgr.CloseAll()

	_, connErr := mgr.Connect(host)
	if connErr == nil {
		t.Fatal("expected error for wrong password, got nil")
	}
}

// TestManager_Close tests closing a single session
func TestManager_Close(t *testing.T) {
	encKey := make([]byte, 32)
	password := "test-pass"

	addr, cleanup := newTestSSHServer(t, password)
	defer cleanup()

	host := newTestHost("host-3", "testuser", password, "password")
	h, p, err := net.SplitHostPort(addr)
	if err == nil {
		host.Host = h
		_, _ = fmt.Sscanf(p, "%d", &host.Port)
	}
	host.Secret = encryptSecret(t, encKey, []byte(password))

	mgr := ssh.NewManager(encKey)
	defer mgr.CloseAll()

	sessionID, err := mgr.Connect(host)
	if err != nil {
		t.Fatalf("Connect failed: %v", err)
	}

	// Verify session exists
	_, ok := mgr.Get(sessionID)
	if !ok {
		t.Fatal("session not found before close")
	}

	// Close session
	err = mgr.Close(sessionID)
	if err != nil {
		t.Fatalf("Close failed: %v", err)
	}

	// Verify session is gone
	_, ok = mgr.Get(sessionID)
	if ok {
		t.Fatal("session still exists after close")
	}
}

// TestManager_CloseAll tests closing all sessions
func TestManager_CloseAll(t *testing.T) {
	encKey := make([]byte, 32)
	password := "test-pass"

	addr, cleanup := newTestSSHServer(t, password)
	defer cleanup()

	mgr := ssh.NewManager(encKey)

	// Connect multiple sessions
	sessionIDs := []string{}
	h, p, _ := net.SplitHostPort(addr)
	for i := 0; i < 3; i++ {
		host := newTestHost(fmt.Sprintf("host-4-%d", i), "testuser", password, "password")
		host.Host = h
		_, _ = fmt.Sscanf(p, "%d", &host.Port)
		host.Secret = encryptSecret(t, encKey, []byte(password))

		sessionID, err := mgr.Connect(host)
		if err != nil {
			t.Fatalf("Connect %d failed: %v", i, err)
		}
		sessionIDs = append(sessionIDs, sessionID)
	}

	// Verify all sessions exist
	for _, sid := range sessionIDs {
		_, ok := mgr.Get(sid)
		if !ok {
			t.Fatalf("session %s not found before CloseAll", sid)
		}
	}

	// Close all
	mgr.CloseAll()

	// Verify all sessions are gone
	for _, sid := range sessionIDs {
		_, ok := mgr.Get(sid)
		if ok {
			t.Fatalf("session %s still exists after CloseAll", sid)
		}
	}
}

// TestManager_GetNonexistent tests getting a nonexistent session
func TestManager_GetNonexistent(t *testing.T) {
	encKey := make([]byte, 32)
	mgr := ssh.NewManager(encKey)
	defer mgr.CloseAll()

	_, ok := mgr.Get("nonexistent-id")
	if ok {
		t.Fatal("expected Get to return false for nonexistent session")
	}
}

// TestManager_CloseNonexistent tests closing a nonexistent session
func TestManager_CloseNonexistent(t *testing.T) {
	encKey := make([]byte, 32)
	mgr := ssh.NewManager(encKey)
	defer mgr.CloseAll()

	err := mgr.Close("nonexistent-id")
	if err == nil {
		t.Fatal("expected error when closing nonexistent session")
	}
}

// BenchmarkConnect benchmarks the connection establishment
func BenchmarkConnect(b *testing.B) {
	encKey := make([]byte, 32)
	password := "bench-pass"

	addr, cleanup := newTestSSHServer(&testing.T{}, password)
	defer cleanup()

	host := newTestHost("host-bench", "testuser", password, "password")
	h, p, err := net.SplitHostPort(addr)
	if err == nil {
		host.Host = h
		_, _ = fmt.Sscanf(p, "%d", &host.Port)
	}
	host.Secret = encryptSecret(&testing.T{}, encKey, []byte(password))

	mgr := ssh.NewManager(encKey)
	defer mgr.CloseAll()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := mgr.Connect(host)
		if err != nil {
			b.Fatalf("Connect failed: %v", err)
		}
	}
}
