package main

import (
	"context"
	"errors"
	"fmt"
	"sync"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"gss/internal/ssh"
	"gss/internal/store"
)

type App struct {
	ctx       context.Context
	db        *store.DB
	sshMgr    *ssh.Manager
	terminals sync.Map // termID string -> *ssh.TerminalSession
	encKey    []byte
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	db, err := store.New()
	if err != nil {
		panic(err)
	}
	a.db = db

	// Initialize SSH manager with a placeholder encryption key
	// TODO: Load from secure keystore
	a.encKey = make([]byte, 32)
	a.sshMgr = ssh.NewManager(a.encKey)
}

func (a *App) shutdown(ctx context.Context) {
	if a.sshMgr != nil {
		a.sshMgr.CloseAll()
	}
	if a.db != nil {
		a.db.Close()
	}
}

// ListHosts 返回所有主机配置（Secret 字段不返回给前端）
func (a *App) ListHosts() ([]*store.Host, error) {
	hosts, err := a.db.ListHosts()
	if err != nil {
		return nil, err
	}
	// 不暴露加密后的 Secret 字段给前端
	for _, h := range hosts {
		h.Secret = nil
	}
	return hosts, nil
}

// CreateHost 创建主机配置
func (a *App) CreateHost(h *store.Host) error {
	return a.db.CreateHost(h)
}

// UpdateHost 更新主机配置
func (a *App) UpdateHost(h *store.Host) error {
	return a.db.UpdateHost(h)
}

// DeleteHost 删除主机配置
func (a *App) DeleteHost(id string) error {
	return a.db.DeleteHost(id)
}

// SSHConnect connects to a host and returns the session ID
func (a *App) SSHConnect(hostID string) (string, error) {
	host, err := a.db.GetHost(hostID)
	if err != nil {
		return "", fmt.Errorf("failed to get host: %w", err)
	}

	sessionID, err := a.sshMgr.Connect(host)
	if err != nil {
		return "", fmt.Errorf("failed to connect: %w", err)
	}

	return sessionID, nil
}

// SSHDisconnect closes an SSH session
func (a *App) SSHDisconnect(sessionID string) error {
	return a.sshMgr.Close(sessionID)
}

// OpenTerminal opens a PTY terminal on an existing SSH session
func (a *App) OpenTerminal(sessionID string, rows, cols uint32) (string, error) {
	sess, ok := a.sshMgr.Get(sessionID)
	if !ok {
		return "", errors.New("session not found")
	}

	termSess, err := ssh.OpenTerminal(sess, rows, cols)
	if err != nil {
		return "", fmt.Errorf("failed to open terminal: %w", err)
	}

	termID := termSess.ID()
	a.terminals.Store(termID, termSess)

	// Start goroutine to pump terminal output to frontend
	go a.pumpTerminalOutput(termID, termSess)

	return termID, nil
}

// TerminalInput sends input to a terminal session
func (a *App) TerminalInput(termID string, data string) error {
	val, ok := a.terminals.Load(termID)
	if !ok {
		return errors.New("terminal not found")
	}

	termSess := val.(*ssh.TerminalSession)
	return termSess.Write([]byte(data))
}

// TerminalResize resizes a terminal window
func (a *App) TerminalResize(termID string, rows, cols uint32) error {
	val, ok := a.terminals.Load(termID)
	if !ok {
		return errors.New("terminal not found")
	}

	termSess := val.(*ssh.TerminalSession)
	return termSess.Resize(rows, cols)
}

// TerminalClose closes a terminal session
func (a *App) TerminalClose(termID string) error {
	val, ok := a.terminals.Load(termID)
	if !ok {
		return errors.New("terminal not found")
	}

	termSess := val.(*ssh.TerminalSession)
	a.terminals.Delete(termID)
	return termSess.Close()
}

// pumpTerminalOutput continuously reads from terminal's output channel and emits to frontend
func (a *App) pumpTerminalOutput(termID string, t *ssh.TerminalSession) {
	defer func() {
		a.terminals.Delete(termID)
		runtime.EventsEmit(a.ctx, "terminal:closed", termID)
	}()

	for data := range t.ReadChan() {
		runtime.EventsEmit(a.ctx, "terminal:data:"+termID, data)
	}
}
