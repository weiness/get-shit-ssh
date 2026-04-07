package store

import (
	"database/sql"
	"os"
	"path/filepath"
	"runtime"

	_ "modernc.org/sqlite"
)

type DB struct {
	conn *sql.DB
}

func New() (*DB, error) {
	var dbPath string
	if p := os.Getenv("GSS_DB_PATH"); p != "" {
		dbPath = p
	} else {
		dir, err := dataDir()
		if err != nil {
			return nil, err
		}
		if err := os.MkdirAll(dir, 0700); err != nil {
			return nil, err
		}
		dbPath = filepath.Join(dir, "gss.db")
	}
	conn, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, err
	}
	conn.SetMaxOpenConns(1) // SQLite 单写连接
	db := &DB{conn: conn}
	if err := db.migrate(); err != nil {
		return nil, err
	}
	return db, nil
}

func (db *DB) Close() error {
	return db.conn.Close()
}

func (db *DB) migrate() error {
	_, err := db.conn.Exec(`
		CREATE TABLE IF NOT EXISTS hosts (
			id          TEXT PRIMARY KEY,
			name        TEXT NOT NULL,
			group_name  TEXT NOT NULL DEFAULT '',
			host        TEXT NOT NULL,
			port        INTEGER NOT NULL DEFAULT 22,
			username    TEXT NOT NULL,
			auth_type   TEXT NOT NULL,
			secret      BLOB,
			key_id      TEXT NOT NULL DEFAULT '',
			created_at  INTEGER NOT NULL,
			updated_at  INTEGER NOT NULL
		);
		CREATE TABLE IF NOT EXISTS keys (
			id          TEXT PRIMARY KEY,
			name        TEXT NOT NULL,
			public_key  TEXT NOT NULL,
			private_key BLOB NOT NULL,
			created_at  INTEGER NOT NULL
		);
		CREATE TABLE IF NOT EXISTS session_logs (
			id           TEXT PRIMARY KEY,
			host_id      TEXT NOT NULL,
			host_name    TEXT NOT NULL,
			username     TEXT NOT NULL,
			address      TEXT NOT NULL,
			connected_at INTEGER NOT NULL,
			duration     INTEGER NOT NULL DEFAULT 0
		);
	`)
	return err
}

func dataDir() (string, error) {
	switch runtime.GOOS {
	case "windows":
		return filepath.Join(os.Getenv("APPDATA"), "gss"), nil
	case "darwin":
		home, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		return filepath.Join(home, "Library", "Application Support", "gss"), nil
	default:
		home, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		return filepath.Join(home, ".config", "gss"), nil
	}
}
