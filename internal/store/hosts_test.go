package store_test

import (
	"os"
	"testing"
	"time"

	"gss/internal/store"
)

func newTestDB(t *testing.T) *store.DB {
	t.Helper()
	// 使用内存数据库测试
	os.Setenv("GSS_DB_PATH", ":memory:")
	db, err := store.New()
	if err != nil {
		t.Fatalf("failed to create test db: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	return db
}

func TestHostCRUD(t *testing.T) {
	db := newTestDB(t)

	// Create
	h := &store.Host{
		Name:      "test-server",
		GroupName: "prod",
		Host:      "192.168.1.1",
		Port:      22,
		Username:  "root",
		AuthType:  "password",
		Secret:    []byte("encrypted-secret"),
	}
	if err := db.CreateHost(h); err != nil {
		t.Fatalf("CreateHost: %v", err)
	}
	if h.ID == "" {
		t.Fatal("expected ID to be set after create")
	}

	// List
	hosts, err := db.ListHosts()
	if err != nil {
		t.Fatalf("ListHosts: %v", err)
	}
	if len(hosts) != 1 {
		t.Fatalf("expected 1 host, got %d", len(hosts))
	}

	// Update
	h.Name = "updated-server"
	h.UpdatedAt = time.Now().Unix()
	if err := db.UpdateHost(h); err != nil {
		t.Fatalf("UpdateHost: %v", err)
	}

	// Get
	got, err := db.GetHost(h.ID)
	if err != nil {
		t.Fatalf("GetHost: %v", err)
	}
	if got.Name != "updated-server" {
		t.Fatalf("expected updated name, got %q", got.Name)
	}

	// Delete
	if err := db.DeleteHost(h.ID); err != nil {
		t.Fatalf("DeleteHost: %v", err)
	}
	hosts, _ = db.ListHosts()
	if len(hosts) != 0 {
		t.Fatal("expected 0 hosts after delete")
	}
}
