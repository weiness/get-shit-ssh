package ssh

import (
	"errors"
	"fmt"
	"net"
	"sync"

	"github.com/google/uuid"

	gossh "golang.org/x/crypto/ssh"

	"gss/internal/crypto"
	"gss/internal/store"
)

// Session represents an active SSH connection session
type Session struct {
	id     string
	client *gossh.Client
}

// ID returns the session ID
func (s *Session) ID() string {
	return s.id
}

// Client returns the underlying SSH client
func (s *Session) Client() *gossh.Client {
	return s.client
}

// Dialer is an interface for dialing SSH connections.
// It allows for dependency injection in tests.
type Dialer interface {
	Dial(network, addr string, config *gossh.ClientConfig) (*gossh.Client, error)
}

// DefaultDialer is the default SSH dialer using golang.org/x/crypto/ssh
type DefaultDialer struct{}

func (d *DefaultDialer) Dial(network, addr string, config *gossh.ClientConfig) (*gossh.Client, error) {
	return gossh.Dial(network, addr, config)
}

// Manager manages multiple SSH sessions
type Manager struct {
	mu       sync.RWMutex
	sessions map[string]*Session
	encKey   []byte // AES-GCM encryption key for decrypting Host.Secret
	dialer   Dialer
}

// NewManager creates a new SSH session manager
func NewManager(encKey []byte) *Manager {
	return &Manager{
		sessions: make(map[string]*Session),
		encKey:   encKey,
		dialer:   &DefaultDialer{},
	}
}

// Connect establishes an SSH connection to the given host and returns a session ID
func (m *Manager) Connect(host *store.Host) (string, error) {
	if host == nil {
		return "", errors.New("host is nil")
	}

	// Decrypt the secret (password or private key content)
	plain, err := crypto.Decrypt(m.encKey, host.Secret)
	if err != nil {
		return "", fmt.Errorf("failed to decrypt secret: %w", err)
	}

	// Build SSH client config based on auth type
	var authMethod gossh.AuthMethod

	switch host.AuthType {
	case "password":
		authMethod = gossh.Password(string(plain))
	case "key":
		// Parse private key
		signer, err := gossh.ParsePrivateKey(plain)
		if err != nil {
			return "", fmt.Errorf("failed to parse private key: %w", err)
		}
		authMethod = gossh.PublicKeys(signer)
	default:
		return "", fmt.Errorf("unsupported auth type: %s", host.AuthType)
	}

	config := &gossh.ClientConfig{
		User: host.Username,
		Auth: []gossh.AuthMethod{authMethod},
		HostKeyCallback: func(hostname string, remote net.Addr, key gossh.PublicKey) error {
			// Accept any host key for now (insecure, but suitable for MVP)
			// TODO: Implement host key verification with known_hosts
			return nil
		},
		Timeout: 0, // No timeout for now
	}

	// Dial SSH server
	addr := fmt.Sprintf("%s:%d", host.Host, host.Port)
	client, err := m.dialer.Dial("tcp", addr, config)
	if err != nil {
		return "", fmt.Errorf("failed to dial SSH server: %w", err)
	}

	// Generate session ID and store session
	sessionID := uuid.New().String()

	m.mu.Lock()
	m.sessions[sessionID] = &Session{
		id:     sessionID,
		client: client,
	}
	m.mu.Unlock()

	return sessionID, nil
}

// Get retrieves a session by ID
func (m *Manager) Get(sessionID string) (*Session, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	session, ok := m.sessions[sessionID]
	return session, ok
}

// Close closes a specific session
func (m *Manager) Close(sessionID string) error {
	m.mu.Lock()
	session, ok := m.sessions[sessionID]
	if !ok {
		m.mu.Unlock()
		return fmt.Errorf("session not found: %s", sessionID)
	}
	delete(m.sessions, sessionID)
	m.mu.Unlock()

	return session.client.Close()
}

// CloseAll closes all active sessions
func (m *Manager) CloseAll() {
	m.mu.Lock()
	sessions := make(map[string]*Session)
	for id, session := range m.sessions {
		sessions[id] = session
	}
	m.sessions = make(map[string]*Session)
	m.mu.Unlock()

	for _, session := range sessions {
		session.client.Close()
	}
}
