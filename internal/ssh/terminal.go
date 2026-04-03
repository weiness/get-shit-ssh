package ssh

import (
	"errors"
	"fmt"
	"io"
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

	buf := make([]byte, 4096)
	for {
		n, err := stdout.Read(buf)
		if n > 0 {
			// Copy data to avoid buffer reuse issues
			chunk := make([]byte, n)
			copy(chunk, buf[:n])

			select {
			case outCh <- chunk:
			case <-done:
				return
			}
		}
		if err != nil {
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

	// Get the underlying SSH client
	client := sess.Client()
	if client == nil {
		return nil, errors.New("SSH client is nil")
	}

	// Open a new SSH session
	sshSess, err := client.NewSession()
	if err != nil {
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
		return nil, fmt.Errorf("failed to request PTY: %w", err)
	}

	// Get stdin pipe for writing
	stdin, err := sshSess.StdinPipe()
	if err != nil {
		sshSess.Close()
		return nil, fmt.Errorf("failed to get stdin pipe: %w", err)
	}

	// Get stdout pipe for reading
	stdout, err := sshSess.StdoutPipe()
	if err != nil {
		sshSess.Close()
		return nil, fmt.Errorf("failed to get stdout pipe: %w", err)
	}

	// Start shell
	err = sshSess.Shell()
	if err != nil {
		sshSess.Close()
		return nil, fmt.Errorf("failed to start shell: %w", err)
	}

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

	return termSess, nil
}
