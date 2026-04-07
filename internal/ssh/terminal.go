package ssh

import (
	"errors"
	"fmt"
	"io"
	"log"
	"sync"

	gossh "golang.org/x/crypto/ssh"
)

// TerminalSession represents an active SSH terminal (PTY) session
type TerminalSession struct {
	id        string
	sshSess   *gossh.Session
	stdin     io.WriteCloser
	outCh     chan []byte     // reader goroutine writes here, external code reads
	done      chan struct{}   // signal to reader goroutine to stop
	closeOnce sync.Once
}

// ID returns the terminal session ID
func (t *TerminalSession) ID() string {
	return t.id
}

// ReadChan returns the channel for reading output from the terminal
func (t *TerminalSession) ReadChan() <-chan []byte {
	return t.outCh
}

// Write writes data to the terminal's stdin
func (t *TerminalSession) Write(data []byte) error {
	if t.stdin == nil {
		return errors.New("terminal session is closed")
	}
	_, err := t.stdin.Write(data)
	return err
}

// Resize resizes the terminal window
func (t *TerminalSession) Resize(rows, cols uint32) error {
	if t.sshSess == nil {
		return errors.New("terminal session is closed")
	}
	return t.sshSess.WindowChange(int(rows), int(cols))
}

// Close closes the terminal session and releases all resources
func (t *TerminalSession) Close() error {
	var closeErr error

	t.closeOnce.Do(func() {
		// Signal reader goroutine to stop
		close(t.done)

		// Close stdin
		if t.stdin != nil {
			t.stdin.Close()
		}

		// Close SSH session
		if t.sshSess != nil {
			closeErr = t.sshSess.Close()
		}

		// Drain and close output channel
		// Reader goroutine will close it when done channel is closed
		go func() {
			for range t.outCh {
				// Drain channel
			}
		}()
	})

	return closeErr
}

// readerLoop continuously reads from stdout and writes to outCh
// It stops when done channel is closed or when stdout returns error
func readerLoop(stdout io.Reader, outCh chan []byte, done <-chan struct{}) {
	defer close(outCh)

	log.Printf("[readerLoop] Started reading from stdout")
	buf := make([]byte, 4096)
	for {
		n, err := stdout.Read(buf)
		if n > 0 {
			log.Printf("[readerLoop] Read %d bytes from stdout", n)
			// Copy data to avoid buffer reuse issues
			chunk := make([]byte, n)
			copy(chunk, buf[:n])

			select {
			case outCh <- chunk:
				log.Printf("[readerLoop] Sent %d bytes to outCh", n)
			case <-done:
				log.Printf("[readerLoop] Done signal received, exiting")
				return
			}
		}
		if err != nil {
			log.Printf("[readerLoop] Read error: %v, exiting", err)
			// EOF or other error, exit reader
			return
		}
	}
}

// OpenTerminal opens a new terminal (PTY) session on the given SSH session
func OpenTerminal(sess *Session, rows, cols uint32) (*TerminalSession, error) {
	if sess == nil {
		return nil, errors.New("session is nil")
	}

	log.Printf("[OpenTerminal] Opening terminal for session %s, size %dx%d", sess.ID(), rows, cols)

	// Get the underlying SSH client
	client := sess.Client()
	if client == nil {
		return nil, errors.New("SSH client is nil")
	}

	// Open a new SSH session
	sshSess, err := client.NewSession()
	if err != nil {
		log.Printf("[OpenTerminal] Failed to create SSH session: %v", err)
		return nil, fmt.Errorf("failed to open new session: %w", err)
	}

	// Request PTY
	err = sshSess.RequestPty("xterm-256color", int(rows), int(cols), gossh.TerminalModes{
		gossh.ECHO:          1,
		gossh.TTY_OP_ISPEED: 14400,
		gossh.TTY_OP_OSPEED: 14400,
	})
	if err != nil {
		sshSess.Close()
		log.Printf("[OpenTerminal] Failed to request PTY: %v", err)
		return nil, fmt.Errorf("failed to request PTY: %w", err)
	}

	// Get stdin pipe for writing
	stdin, err := sshSess.StdinPipe()
	if err != nil {
		sshSess.Close()
		log.Printf("[OpenTerminal] Failed to get stdin pipe: %v", err)
		return nil, fmt.Errorf("failed to get stdin pipe: %w", err)
	}

	// Get stdout pipe for reading
	stdout, err := sshSess.StdoutPipe()
	if err != nil {
		sshSess.Close()
		log.Printf("[OpenTerminal] Failed to get stdout pipe: %v", err)
		return nil, fmt.Errorf("failed to get stdout pipe: %w", err)
	}

	// Start shell
	err = sshSess.Shell()
	if err != nil {
		sshSess.Close()
		log.Printf("[OpenTerminal] Failed to start shell: %v", err)
		return nil, fmt.Errorf("failed to start shell: %w", err)
	}

	log.Printf("[OpenTerminal] Shell started successfully")

	// Create terminal session
	termSess := &TerminalSession{
		id:      sess.ID(),
		sshSess: sshSess,
		stdin:   stdin,
		outCh:   make(chan []byte, 256),
		done:    make(chan struct{}),
	}

	// Start reader goroutine
	go readerLoop(stdout, termSess.outCh, termSess.done)

	log.Printf("[OpenTerminal] Terminal session created with ID: %s", termSess.id)
	return termSess, nil
}
