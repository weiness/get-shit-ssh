package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"sync"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"gss/internal/crypto"
	"gss/internal/ssh"
	"gss/internal/store"
)

type App struct {
	ctx        context.Context
	db         *store.DB
	sshMgr     *ssh.Manager
	terminals  sync.Map // termID string -> *ssh.TerminalSession
	sftpSess   sync.Map // sftpID string -> *ssh.SFTPSession
	sessionLog sync.Map // sessionID string -> logID string
	encKey     []byte
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

	// Record session start
	addr := fmt.Sprintf("%s:%d", host.Host, host.Port)
	if log, e := a.db.LogSessionStart(host.ID, host.Name, host.Username, addr); e == nil {
		a.sessionLog.Store(sessionID, log.ID)
	}

	return sessionID, nil
}

// SSHDisconnect closes an SSH session
func (a *App) SSHDisconnect(sessionID string) error {
	if logID, ok := a.sessionLog.LoadAndDelete(sessionID); ok {
		_ = a.db.LogSessionEnd(logID.(string))
	}
	return a.sshMgr.Close(sessionID)
}

// OpenTerminal opens a PTY terminal on an existing SSH session
func (a *App) OpenTerminal(sessionID string, rows, cols uint32) (string, error) {
	log.Printf("[OpenTerminal] Opening terminal for session %s, size %dx%d", sessionID, rows, cols)
	sess, ok := a.sshMgr.Get(sessionID)
	if !ok {
		log.Printf("[OpenTerminal] Session not found: %s", sessionID)
		return "", errors.New("session not found")
	}

	termSess, err := ssh.OpenTerminal(sess, rows, cols)
	if err != nil {
		log.Printf("[OpenTerminal] Failed to open terminal: %v", err)
		return "", fmt.Errorf("failed to open terminal: %w", err)
	}

	termID := termSess.ID()
	a.terminals.Store(termID, termSess)
	log.Printf("[OpenTerminal] Terminal opened successfully, termID: %s", termID)

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
		log.Printf("[pumpTerminalOutput] Terminal %s closed, cleaning up", termID)
		a.terminals.Delete(termID)
		runtime.EventsEmit(a.ctx, "terminal:closed", termID)
	}()

	log.Printf("[pumpTerminalOutput] Started pumping for terminal %s", termID)
	for data := range t.ReadChan() {
		log.Printf("[pumpTerminalOutput] Emitting %d bytes for terminal %s", len(data), termID)
		runtime.EventsEmit(a.ctx, "terminal:data:"+termID, data)
	}
	log.Printf("[pumpTerminalOutput] ReadChan closed for terminal %s", termID)
}

// SFTPOpen opens an SFTP subsystem on an existing SSH session and returns an sftpID
func (a *App) SFTPOpen(sessionID string) (string, error) {
	sess, ok := a.sshMgr.Get(sessionID)
	if !ok {
		return "", errors.New("session not found")
	}

	sftpSess, err := ssh.OpenSFTP(sess)
	if err != nil {
		return "", fmt.Errorf("failed to open SFTP: %w", err)
	}

	sftpID := sftpSess.ID()
	a.sftpSess.Store(sftpID, sftpSess)
	return sftpID, nil
}

// SFTPClose closes an SFTP session
func (a *App) SFTPClose(sftpID string) error {
	val, ok := a.sftpSess.LoadAndDelete(sftpID)
	if !ok {
		return errors.New("sftp session not found")
	}
	return val.(*ssh.SFTPSession).Close()
}

// SFTPListDir lists a remote directory
func (a *App) SFTPListDir(sftpID, remotePath string) ([]*ssh.FileInfo, error) {
	val, ok := a.sftpSess.Load(sftpID)
	if !ok {
		return nil, errors.New("sftp session not found")
	}
	return val.(*ssh.SFTPSession).ListDir(remotePath)
}

// SFTPGetwd returns the remote working directory
func (a *App) SFTPGetwd(sftpID string) (string, error) {
	val, ok := a.sftpSess.Load(sftpID)
	if !ok {
		return "", errors.New("sftp session not found")
	}
	return val.(*ssh.SFTPSession).Getwd()
}

// SFTPDownload downloads a remote file to a local path
func (a *App) SFTPDownload(sftpID, remotePath, localPath string) error {
	val, ok := a.sftpSess.Load(sftpID)
	if !ok {
		return errors.New("sftp session not found")
	}
	return val.(*ssh.SFTPSession).Download(remotePath, localPath)
}

// SFTPUpload uploads a local file to a remote path
func (a *App) SFTPUpload(sftpID, localPath, remotePath string) error {
	val, ok := a.sftpSess.Load(sftpID)
	if !ok {
		return errors.New("sftp session not found")
	}
	return val.(*ssh.SFTPSession).Upload(localPath, remotePath)
}

// SFTPDelete removes a remote file
func (a *App) SFTPDelete(sftpID, remotePath string) error {
	val, ok := a.sftpSess.Load(sftpID)
	if !ok {
		return errors.New("sftp session not found")
	}
	return val.(*ssh.SFTPSession).Delete(remotePath)
}

// SFTPRename renames or moves a remote file
func (a *App) SFTPRename(sftpID, oldPath, newPath string) error {
	val, ok := a.sftpSess.Load(sftpID)
	if !ok {
		return errors.New("sftp session not found")
	}
	return val.(*ssh.SFTPSession).Rename(oldPath, newPath)
}

// SFTPMkdir creates a remote directory
func (a *App) SFTPMkdir(sftpID, remotePath string) error {
	val, ok := a.sftpSess.Load(sftpID)
	if !ok {
		return errors.New("sftp session not found")
	}
	return val.(*ssh.SFTPSession).Mkdir(remotePath)
}

// GeneratedKey holds the result of a key generation operation.
type GeneratedKey struct {
	PublicKey string `json:"publicKey"`
	KeyID     string `json:"keyId"`
}

// GenerateSSHKey generates an SSH key pair and stores it in the database.
// algorithm must be "ed25519" or "ecdsa".
func (a *App) GenerateSSHKey(algorithm, name string) (*GeneratedKey, error) {
	pubKey, privPEM, err := ssh.GenerateKey(algorithm)
	if err != nil {
		return nil, fmt.Errorf("generate key: %w", err)
	}

	encPriv, err := encryptKey(a.encKey, privPEM)
	if err != nil {
		return nil, fmt.Errorf("encrypt private key: %w", err)
	}

	info, err := a.db.SaveKey(name, pubKey, encPriv)
	if err != nil {
		return nil, fmt.Errorf("save key: %w", err)
	}
	return &GeneratedKey{PublicKey: pubKey, KeyID: info.ID}, nil
}

// ImportSSHKey imports a PEM-encoded private key and stores it in the database.
// Returns the key ID.
func (a *App) ImportSSHKey(pemData, name string) (string, error) {
	pubKey, privPEM, err := ssh.ImportKey([]byte(pemData))
	if err != nil {
		return "", fmt.Errorf("import key: %w", err)
	}

	encPriv, err := encryptKey(a.encKey, privPEM)
	if err != nil {
		return "", fmt.Errorf("encrypt private key: %w", err)
	}

	info, err := a.db.SaveKey(name, pubKey, encPriv)
	if err != nil {
		return "", fmt.Errorf("save key: %w", err)
	}
	return info.ID, nil
}

// ListSSHKeys returns all stored SSH keys (without private key data).
func (a *App) ListSSHKeys() ([]*store.KeyInfo, error) {
	return a.db.ListKeys()
}

// DeleteSSHKey removes a stored SSH key by ID.
func (a *App) DeleteSSHKey(id string) error {
	return a.db.DeleteKey(id)
}

// GetPublicKey returns the public key string for the given key ID.
func (a *App) GetPublicKey(id string) (string, error) {
	info, _, err := a.db.GetKey(id)
	if err != nil {
		return "", err
	}
	if info == nil {
		return "", errors.New("key not found")
	}
	return info.PublicKey, nil
}

// CreateHostWithPassword creates a host config using password authentication.
// The plaintext password is encrypted server-side before storage.
func (a *App) CreateHostWithPassword(h *store.Host, password string) error {
	enc, err := crypto.Encrypt(a.encKey, []byte(password))
	if err != nil {
		return fmt.Errorf("encrypt password: %w", err)
	}
	h.AuthType = "password"
	h.Secret = enc
	h.KeyID = ""
	return a.db.CreateHost(h)
}

// CreateHostWithKey creates a host config using SSH key authentication.
// keyID must reference an existing stored key.
func (a *App) CreateHostWithKey(h *store.Host, keyID string) error {
	_, encPriv, err := a.db.GetKey(keyID)
	if err != nil {
		return fmt.Errorf("get key: %w", err)
	}
	if encPriv == nil {
		return errors.New("key not found")
	}
	h.AuthType = "key"
	h.KeyID = keyID
	h.Secret = encPriv
	return a.db.CreateHost(h)
}

// UpdateHostWithPassword updates a host config to use password authentication.
// If password is empty, the existing secret is preserved (metadata-only update).
func (a *App) UpdateHostWithPassword(h *store.Host, password string) error {
	if password == "" {
		existing, err := a.db.GetHost(h.ID)
		if err != nil || existing == nil {
			return errors.New("host not found")
		}
		h.AuthType = existing.AuthType
		h.Secret = existing.Secret
		h.KeyID = existing.KeyID
		return a.db.UpdateHost(h)
	}
	enc, err := crypto.Encrypt(a.encKey, []byte(password))
	if err != nil {
		return fmt.Errorf("encrypt password: %w", err)
	}
	h.AuthType = "password"
	h.Secret = enc
	h.KeyID = ""
	return a.db.UpdateHost(h)
}

// UpdateHostWithKey updates a host config to use SSH key authentication.
func (a *App) UpdateHostWithKey(h *store.Host, keyID string) error {
	_, encPriv, err := a.db.GetKey(keyID)
	if err != nil {
		return fmt.Errorf("get key: %w", err)
	}
	if encPriv == nil {
		return errors.New("key not found")
	}
	h.AuthType = "key"
	h.KeyID = keyID
	h.Secret = encPriv
	return a.db.UpdateHost(h)
}

// encryptKey is a thin wrapper so we can test without importing crypto directly.
func encryptKey(encKey, plaintext []byte) ([]byte, error) {
	return crypto.Encrypt(encKey, plaintext)
}

// TestConnection tests SSH connectivity with raw credentials without saving.
// authType must be "password" or "key". For password, pass plaintext in secret.
// For key auth, pass the keyID in secret.
func (a *App) TestConnection(host, username string, port int, authType, secret string) error {
	h := &store.Host{
		Host:     host,
		Port:     port,
		Username: username,
		AuthType: authType,
	}

	var encSecret []byte
	var err error

	switch authType {
	case "password":
		encSecret, err = crypto.Encrypt(a.encKey, []byte(secret))
		if err != nil {
			return fmt.Errorf("encrypt: %w", err)
		}
	case "key":
		_, encPriv, err := a.db.GetKey(secret)
		if err != nil {
			return fmt.Errorf("get key: %w", err)
		}
		if encPriv == nil {
			return errors.New("key not found")
		}
		encSecret = encPriv
	default:
		return fmt.Errorf("unknown auth type: %s", authType)
	}

	h.Secret = encSecret
	sessionID, err := a.sshMgr.Connect(h)
	if err != nil {
		return err
	}
	_ = a.sshMgr.Close(sessionID)
	return nil
}

// OpenFilePickerDialog opens a native file-open dialog and returns the selected path.
func (a *App) OpenFilePickerDialog(title string) (string, error) {
	return runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: title,
	})
}

// SaveFilePickerDialog opens a native save dialog and returns the chosen destination path.
func (a *App) SaveFilePickerDialog(title, defaultFilename string) (string, error) {
	return runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           title,
		DefaultFilename: defaultFilename,
	})
}

// ListSessionLogs returns recent session history (up to 100 entries).
func (a *App) ListSessionLogs() ([]*store.SessionLog, error) {
	return a.db.ListSessionLogs(100)
}

// ClearSessionLogs deletes all session history.
func (a *App) ClearSessionLogs() error {
	return a.db.ClearSessionLogs()
}
