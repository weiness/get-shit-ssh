package ssh

import (
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"

	pkgsftp "github.com/pkg/sftp"
	gossh "golang.org/x/crypto/ssh"
)

// FileInfo describes a remote file or directory
type FileInfo struct {
	Name    string `json:"name"`
	Path    string `json:"path"`
	Size    int64  `json:"size"`
	Mode    string `json:"mode"`
	IsDir   bool   `json:"isDir"`
	ModTime int64  `json:"modTime"` // Unix timestamp
}

// sftpClient is an interface over *sftp.Client to allow testing
type sftpClient interface {
	ReadDir(p string) ([]os.FileInfo, error)
	ReadFile(path string) (io.ReadCloser, error)
	WriteFile(path string) (io.WriteCloser, error)
	Remove(path string) error
	Rename(oldname, newname string) error
	MkdirAll(path string) error
	Getwd() (string, error)
	Close() error
}

// realSFTPClient wraps *sftp.Client to implement sftpClient
type realSFTPClient struct {
	c *pkgsftp.Client
}

func (r *realSFTPClient) ReadDir(p string) ([]os.FileInfo, error) { return r.c.ReadDir(p) }
func (r *realSFTPClient) ReadFile(path string) (io.ReadCloser, error) {
	return r.c.Open(path)
}
func (r *realSFTPClient) WriteFile(path string) (io.WriteCloser, error) {
	return r.c.Create(path)
}
func (r *realSFTPClient) Remove(path string) error         { return r.c.Remove(path) }
func (r *realSFTPClient) Rename(o, n string) error         { return r.c.Rename(o, n) }
func (r *realSFTPClient) MkdirAll(path string) error       { return r.c.MkdirAll(path) }
func (r *realSFTPClient) Getwd() (string, error)           { return r.c.Getwd() }
func (r *realSFTPClient) Close() error                     { return r.c.Close() }

// sftpFactory creates an sftpClient from an SSH client (injectable for tests)
type sftpFactory func(client *gossh.Client) (sftpClient, error)

var defaultSFTPFactory sftpFactory = func(client *gossh.Client) (sftpClient, error) {
	c, err := pkgsftp.NewClient(client)
	if err != nil {
		return nil, err
	}
	return &realSFTPClient{c: c}, nil
}

// SFTPSession manages an active SFTP subsystem on top of an SSH connection
type SFTPSession struct {
	id     string
	client sftpClient
}

// ID returns the session ID
func (s *SFTPSession) ID() string { return s.id }

// Close closes the SFTP session
func (s *SFTPSession) Close() error { return s.client.Close() }

// ListDir lists the contents of a remote directory
func (s *SFTPSession) ListDir(remotePath string) ([]*FileInfo, error) {
	entries, err := s.client.ReadDir(remotePath)
	if err != nil {
		return nil, fmt.Errorf("listdir %s: %w", remotePath, err)
	}
	infos := make([]*FileInfo, 0, len(entries))
	for _, e := range entries {
		path := remotePath + "/" + e.Name()
		infos = append(infos, &FileInfo{
			Name:    e.Name(),
			Path:    path,
			Size:    e.Size(),
			Mode:    e.Mode().String(),
			IsDir:   e.IsDir(),
			ModTime: e.ModTime().Unix(),
		})
	}
	return infos, nil
}

// Download downloads a remote file to a local path
func (s *SFTPSession) Download(remotePath, localPath string) error {
	src, err := s.client.ReadFile(remotePath)
	if err != nil {
		return fmt.Errorf("download open %s: %w", remotePath, err)
	}
	defer src.Close()

	if err := os.MkdirAll(filepath.Dir(localPath), 0750); err != nil {
		return fmt.Errorf("download mkdir: %w", err)
	}

	dst, err := os.Create(localPath)
	if err != nil {
		return fmt.Errorf("download create %s: %w", localPath, err)
	}
	defer dst.Close()

	_, err = io.Copy(dst, src)
	return err
}

// Upload uploads a local file to a remote path
func (s *SFTPSession) Upload(localPath, remotePath string) error {
	src, err := os.Open(localPath)
	if err != nil {
		return fmt.Errorf("upload open %s: %w", localPath, err)
	}
	defer src.Close()

	remoteDir := filepath.ToSlash(filepath.Dir(remotePath))
	if err := s.client.MkdirAll(remoteDir); err != nil {
		return fmt.Errorf("upload mkdir %s: %w", remoteDir, err)
	}

	dst, err := s.client.WriteFile(remotePath)
	if err != nil {
		return fmt.Errorf("upload create %s: %w", remotePath, err)
	}
	defer dst.Close()

	_, err = io.Copy(dst, src)
	return err
}

// Delete removes a remote file or empty directory
func (s *SFTPSession) Delete(remotePath string) error {
	return s.client.Remove(remotePath)
}

// Rename renames or moves a remote file
func (s *SFTPSession) Rename(oldPath, newPath string) error {
	return s.client.Rename(oldPath, newPath)
}

// Mkdir creates a remote directory (including parents)
func (s *SFTPSession) Mkdir(remotePath string) error {
	return s.client.MkdirAll(remotePath)
}

// Getwd returns the remote working directory
func (s *SFTPSession) Getwd() (string, error) {
	return s.client.Getwd()
}

// OpenSFTP opens an SFTP subsystem on an existing SSH session
func OpenSFTP(sess *Session) (*SFTPSession, error) {
	return openSFTPWith(sess, defaultSFTPFactory)
}

func openSFTPWith(sess *Session, factory sftpFactory) (*SFTPSession, error) {
	if sess == nil {
		return nil, errors.New("session is nil")
	}
	sshClient := sess.Client()
	if sshClient == nil {
		return nil, errors.New("SSH client is nil")
	}

	cli, err := factory(sshClient)
	if err != nil {
		return nil, fmt.Errorf("failed to open SFTP subsystem: %w", err)
	}

	return &SFTPSession{
		id:     sess.ID(),
		client: cli,
	}, nil
}
