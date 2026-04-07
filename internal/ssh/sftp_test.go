package ssh

import (
	"bytes"
	"errors"
	"io"
	"os"
	"path/filepath"
	"testing"
	"time"

	gossh "golang.org/x/crypto/ssh"
)

// mockSFTPClient is an in-memory implementation of sftpClient for testing
type mockSFTPClient struct {
	files  map[string][]byte       // path -> content (nil means directory)
	dirs   map[string]bool         // path -> isDir
	closed bool
	wd     string
}

func newMockSFTPClient() *mockSFTPClient {
	return &mockSFTPClient{
		files: make(map[string][]byte),
		dirs:  map[string]bool{"/": true},
		wd:    "/home/user",
	}
}

func (m *mockSFTPClient) ReadDir(p string) ([]os.FileInfo, error) {
	if m.closed {
		return nil, errors.New("client closed")
	}
	var entries []os.FileInfo
	for path := range m.files {
		dir := filepath.ToSlash(filepath.Dir(path))
		if dir == p {
			entries = append(entries, &mockFileInfo{
				name:    filepath.Base(path),
				size:    int64(len(m.files[path])),
				isDir:   false,
				modTime: time.Unix(1000, 0),
			})
		}
	}
	for path := range m.dirs {
		if path == p {
			continue
		}
		dir := filepath.ToSlash(filepath.Dir(path))
		if dir == p {
			entries = append(entries, &mockFileInfo{
				name:    filepath.Base(path),
				isDir:   true,
				modTime: time.Unix(1000, 0),
			})
		}
	}
	return entries, nil
}

func (m *mockSFTPClient) ReadFile(path string) (io.ReadCloser, error) {
	if m.closed {
		return nil, errors.New("client closed")
	}
	data, ok := m.files[path]
	if !ok {
		return nil, errors.New("file not found: " + path)
	}
	return io.NopCloser(bytes.NewReader(data)), nil
}

func (m *mockSFTPClient) WriteFile(path string) (io.WriteCloser, error) {
	if m.closed {
		return nil, errors.New("client closed")
	}
	return &mockWriteCloser{m: m, path: path, buf: &bytes.Buffer{}}, nil
}

func (m *mockSFTPClient) Remove(path string) error {
	if m.closed {
		return errors.New("client closed")
	}
	if _, ok := m.files[path]; ok {
		delete(m.files, path)
		return nil
	}
	if m.dirs[path] {
		delete(m.dirs, path)
		return nil
	}
	return errors.New("not found: " + path)
}

func (m *mockSFTPClient) Rename(oldname, newname string) error {
	if m.closed {
		return errors.New("client closed")
	}
	if data, ok := m.files[oldname]; ok {
		m.files[newname] = data
		delete(m.files, oldname)
		return nil
	}
	return errors.New("not found: " + oldname)
}

func (m *mockSFTPClient) MkdirAll(path string) error {
	if m.closed {
		return errors.New("client closed")
	}
	m.dirs[path] = true
	return nil
}

func (m *mockSFTPClient) Getwd() (string, error) {
	if m.closed {
		return "", errors.New("client closed")
	}
	return m.wd, nil
}

func (m *mockSFTPClient) Close() error {
	m.closed = true
	return nil
}

type mockWriteCloser struct {
	m    *mockSFTPClient
	path string
	buf  *bytes.Buffer
}

func (w *mockWriteCloser) Write(p []byte) (int, error) { return w.buf.Write(p) }
func (w *mockWriteCloser) Close() error {
	w.m.files[w.path] = w.buf.Bytes()
	return nil
}

type mockFileInfo struct {
	name    string
	size    int64
	isDir   bool
	modTime time.Time
}

func (f *mockFileInfo) Name() string      { return f.name }
func (f *mockFileInfo) Size() int64       { return f.size }
func (f *mockFileInfo) Mode() os.FileMode { return 0644 }
func (f *mockFileInfo) ModTime() time.Time { return f.modTime }
func (f *mockFileInfo) IsDir() bool       { return f.isDir }
func (f *mockFileInfo) Sys() interface{}  { return nil }

// mockFactory returns a factory that injects a given mockSFTPClient
func mockFactory(cli sftpClient) sftpFactory {
	return func(_ *gossh.Client) (sftpClient, error) {
		return cli, nil
	}
}

func newTestSFTPSession(cli sftpClient) *SFTPSession {
	return &SFTPSession{id: "test-session", client: cli}
}

// --- Tests ---

func TestOpenSFTP_NilSession(t *testing.T) {
	_, err := openSFTPWith(nil, mockFactory(newMockSFTPClient()))
	if err == nil {
		t.Fatal("expected error for nil session")
	}
}

func TestOpenSFTP_FactoryError(t *testing.T) {
	sess := &Session{id: "s1", client: nil}
	_, err := openSFTPWith(sess, func(_ *gossh.Client) (sftpClient, error) {
		return nil, errors.New("factory failed")
	})
	if err == nil {
		t.Fatal("expected error when factory fails")
	}
}

func TestSFTPSession_ListDir(t *testing.T) {
	mock := newMockSFTPClient()
	mock.files["/home/user/file.txt"] = []byte("hello")
	mock.dirs["/home/user/docs"] = true

	s := newTestSFTPSession(mock)
	entries, err := s.ListDir("/home/user")
	if err != nil {
		t.Fatalf("ListDir failed: %v", err)
	}
	if len(entries) != 2 {
		t.Fatalf("expected 2 entries, got %d", len(entries))
	}
}

func TestSFTPSession_ListDir_Empty(t *testing.T) {
	s := newTestSFTPSession(newMockSFTPClient())
	entries, err := s.ListDir("/empty")
	if err != nil {
		t.Fatalf("ListDir empty dir failed: %v", err)
	}
	if len(entries) != 0 {
		t.Fatalf("expected 0 entries, got %d", len(entries))
	}
}

func TestSFTPSession_Download(t *testing.T) {
	mock := newMockSFTPClient()
	content := []byte("file content here")
	mock.files["/remote/file.txt"] = content

	s := newTestSFTPSession(mock)

	tmp := filepath.Join(t.TempDir(), "downloaded.txt")
	if err := s.Download("/remote/file.txt", tmp); err != nil {
		t.Fatalf("Download failed: %v", err)
	}

	got, err := os.ReadFile(tmp)
	if err != nil {
		t.Fatalf("read downloaded file: %v", err)
	}
	if !bytes.Equal(got, content) {
		t.Fatalf("content mismatch: want %q, got %q", content, got)
	}
}

func TestSFTPSession_Download_NotFound(t *testing.T) {
	s := newTestSFTPSession(newMockSFTPClient())
	err := s.Download("/nonexistent.txt", filepath.Join(t.TempDir(), "out.txt"))
	if err == nil {
		t.Fatal("expected error downloading nonexistent file")
	}
}

func TestSFTPSession_Upload(t *testing.T) {
	mock := newMockSFTPClient()
	s := newTestSFTPSession(mock)

	// Create a local temp file
	tmp := filepath.Join(t.TempDir(), "upload.txt")
	content := []byte("upload me")
	if err := os.WriteFile(tmp, content, 0600); err != nil {
		t.Fatalf("create local file: %v", err)
	}

	if err := s.Upload(tmp, "/remote/upload.txt"); err != nil {
		t.Fatalf("Upload failed: %v", err)
	}

	if !bytes.Equal(mock.files["/remote/upload.txt"], content) {
		t.Fatal("uploaded content mismatch")
	}
}

func TestSFTPSession_Upload_LocalNotFound(t *testing.T) {
	s := newTestSFTPSession(newMockSFTPClient())
	err := s.Upload("/nonexistent/local.txt", "/remote/x.txt")
	if err == nil {
		t.Fatal("expected error uploading nonexistent local file")
	}
}

func TestSFTPSession_Delete(t *testing.T) {
	mock := newMockSFTPClient()
	mock.files["/remote/del.txt"] = []byte("bye")

	s := newTestSFTPSession(mock)
	if err := s.Delete("/remote/del.txt"); err != nil {
		t.Fatalf("Delete failed: %v", err)
	}
	if _, ok := mock.files["/remote/del.txt"]; ok {
		t.Fatal("file still exists after Delete")
	}
}

func TestSFTPSession_Delete_NotFound(t *testing.T) {
	s := newTestSFTPSession(newMockSFTPClient())
	if err := s.Delete("/nonexistent.txt"); err == nil {
		t.Fatal("expected error deleting nonexistent file")
	}
}

func TestSFTPSession_Rename(t *testing.T) {
	mock := newMockSFTPClient()
	mock.files["/a.txt"] = []byte("data")

	s := newTestSFTPSession(mock)
	if err := s.Rename("/a.txt", "/b.txt"); err != nil {
		t.Fatalf("Rename failed: %v", err)
	}
	if _, ok := mock.files["/b.txt"]; !ok {
		t.Fatal("new file not found after Rename")
	}
	if _, ok := mock.files["/a.txt"]; ok {
		t.Fatal("old file still exists after Rename")
	}
}

func TestSFTPSession_Mkdir(t *testing.T) {
	mock := newMockSFTPClient()
	s := newTestSFTPSession(mock)

	if err := s.Mkdir("/new/dir"); err != nil {
		t.Fatalf("Mkdir failed: %v", err)
	}
	if !mock.dirs["/new/dir"] {
		t.Fatal("directory not created")
	}
}

func TestSFTPSession_Getwd(t *testing.T) {
	mock := newMockSFTPClient()
	s := newTestSFTPSession(mock)

	wd, err := s.Getwd()
	if err != nil {
		t.Fatalf("Getwd failed: %v", err)
	}
	if wd != "/home/user" {
		t.Fatalf("unexpected wd: %s", wd)
	}
}

func TestSFTPSession_Close(t *testing.T) {
	mock := newMockSFTPClient()
	s := newTestSFTPSession(mock)

	if err := s.Close(); err != nil {
		t.Fatalf("Close failed: %v", err)
	}
	if !mock.closed {
		t.Fatal("mock client not closed")
	}
}

func TestSFTPSession_ID(t *testing.T) {
	s := newTestSFTPSession(newMockSFTPClient())
	if s.ID() != "test-session" {
		t.Fatalf("unexpected ID: %s", s.ID())
	}
}
