package ssh_test

import (
	"bytes"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"errors"
	"fmt"
	"io"
	"net"
	"testing"
	"time"

	gossh "golang.org/x/crypto/ssh"

	"gss/internal/ssh"
)

// newTestTerminalServer starts an SSH server that handles PTY and shell requests
func newTestTerminalServer(t *testing.T, password string) (addr string, cleanup func()) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("failed to listen: %v", err)
	}

	addr = listener.Addr().String()

	// Generate SSH host key
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

			go func(conn net.Conn) {
				sshConn, chans, reqs, err := gossh.NewServerConn(conn, config)
				if err != nil {
					conn.Close()
					return
				}
				defer sshConn.Close()

				// Handle global out-of-band requests (ignored)
				go gossh.DiscardRequests(reqs)

				// Handle channels
				for newChannel := range chans {
					if newChannel.ChannelType() != "session" {
						newChannel.Reject(gossh.UnknownChannelType, "unknown channel type")
						continue
					}

					channel, requests, err := newChannel.Accept()
					if err != nil {
						continue
					}

					// Handle channel requests
					go func(channel gossh.Channel, requests <-chan *gossh.Request) {
						defer channel.Close()

						// Echo server mode — read from channel and echo back
						for req := range requests {
							if req.Type == "pty-req" {
								// Accept PTY request
								req.Reply(true, nil)
								continue
							}
							if req.Type == "shell" {
								// Accept shell request
								req.Reply(true, nil)

								// Send greeting message
								io.WriteString(channel, "Welcome to test SSH server\r\n")

								// Echo mode: read from channel and write back
								buf := make([]byte, 1024)
								for {
									n, err := channel.Read(buf)
									if err != nil {
										return
									}
									channel.Write(buf[:n])
								}
							}
							req.Reply(false, nil)
						}
					}(channel, requests)
				}
			}(conn)
		}
	}()

	cleanup = func() {
		listener.Close()
	}

	return addr, cleanup
}

// TestOpenTerminal tests opening a terminal session
func TestOpenTerminal(t *testing.T) {
	encKey := make([]byte, 32)
	password := "test-pass"

	addr, cleanup := newTestTerminalServer(t, password)
	defer cleanup()

	// Create and connect to host
	host := newTestHost("term-host-1", "testuser", password, "password")
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

	sess, ok := mgr.Get(sessionID)
	if !ok {
		t.Fatal("session not found")
	}

	// Open terminal
	termSess, err := ssh.OpenTerminal(sess, 24, 80)
	if err != nil {
		t.Fatalf("OpenTerminal failed: %v", err)
	}
	defer termSess.Close()

	if termSess.ID() == "" {
		t.Fatal("terminal session ID is empty")
	}
}

// TestTerminalRead tests reading from terminal
func TestTerminalRead(t *testing.T) {
	encKey := make([]byte, 32)
	password := "test-pass"

	addr, cleanup := newTestTerminalServer(t, password)
	defer cleanup()

	// Connect
	host := newTestHost("term-host-2", "testuser", password, "password")
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

	sess, ok := mgr.Get(sessionID)
	if !ok {
		t.Fatal("session not found")
	}

	// Open terminal
	termSess, err := ssh.OpenTerminal(sess, 24, 80)
	if err != nil {
		t.Fatalf("OpenTerminal failed: %v", err)
	}
	defer termSess.Close()

	// Read should get the greeting message
	timeout := time.NewTimer(2 * time.Second)
	defer timeout.Stop()

	select {
	case data := <-termSess.ReadChan():
		if data == nil {
			t.Fatal("read channel closed unexpectedly")
		}
		if !bytes.Contains(data, []byte("Welcome")) {
			t.Fatalf("expected 'Welcome' in output, got: %s", string(data))
		}
	case <-timeout.C:
		t.Fatal("timeout waiting for output")
	}
}

// TestTerminalWrite tests writing to terminal
func TestTerminalWrite(t *testing.T) {
	encKey := make([]byte, 32)
	password := "test-pass"

	addr, cleanup := newTestTerminalServer(t, password)
	defer cleanup()

	// Connect
	host := newTestHost("term-host-3", "testuser", password, "password")
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

	sess, ok := mgr.Get(sessionID)
	if !ok {
		t.Fatal("session not found")
	}

	// Open terminal
	termSess, err := ssh.OpenTerminal(sess, 24, 80)
	if err != nil {
		t.Fatalf("OpenTerminal failed: %v", err)
	}
	defer termSess.Close()

	// Read and discard the welcome message
	timeout := time.NewTimer(2 * time.Second)
	defer timeout.Stop()

	select {
	case <-termSess.ReadChan():
		// Got the welcome message, ignore it
	case <-timeout.C:
		t.Fatal("timeout waiting for welcome message")
	}

	// Write to terminal
	err = termSess.Write([]byte("hello\n"))
	if err != nil {
		t.Fatalf("Write failed: %v", err)
	}

	// Should echo back
	timeout = time.NewTimer(2 * time.Second)
	defer timeout.Stop()

	received := []byte{}
	for {
		select {
		case data := <-termSess.ReadChan():
			if data == nil {
				t.Fatal("read channel closed unexpectedly")
			}
			received = append(received, data...)
			if bytes.Contains(received, []byte("hello")) {
				return // Success!
			}
		case <-timeout.C:
			t.Fatalf("timeout waiting for echo, got: %s", string(received))
		}
	}
}

// TestTerminalResize tests resizing terminal
func TestTerminalResize(t *testing.T) {
	encKey := make([]byte, 32)
	password := "test-pass"

	addr, cleanup := newTestTerminalServer(t, password)
	defer cleanup()

	// Connect
	host := newTestHost("term-host-4", "testuser", password, "password")
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

	sess, ok := mgr.Get(sessionID)
	if !ok {
		t.Fatal("session not found")
	}

	// Open terminal
	termSess, err := ssh.OpenTerminal(sess, 24, 80)
	if err != nil {
		t.Fatalf("OpenTerminal failed: %v", err)
	}
	defer termSess.Close()

	// Resize terminal
	err = termSess.Resize(32, 120)
	if err != nil {
		t.Fatalf("Resize failed: %v", err)
	}
}

// TestTerminalClose tests closing terminal
func TestTerminalClose(t *testing.T) {
	encKey := make([]byte, 32)
	password := "test-pass"

	addr, cleanup := newTestTerminalServer(t, password)
	defer cleanup()

	// Connect
	host := newTestHost("term-host-5", "testuser", password, "password")
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

	sess, ok := mgr.Get(sessionID)
	if !ok {
		t.Fatal("session not found")
	}

	// Open terminal
	termSess, err := ssh.OpenTerminal(sess, 24, 80)
	if err != nil {
		t.Fatalf("OpenTerminal failed: %v", err)
	}

	// Close once
	err = termSess.Close()
	if err != nil {
		t.Fatalf("Close failed: %v", err)
	}

	// Close again (should not panic due to sync.Once)
	err = termSess.Close()
	if err != nil {
		t.Fatalf("second Close failed: %v", err)
	}
}
