package store

import (
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
)

type Host struct {
	ID        string
	Name      string
	GroupName string
	Host      string
	Port      int
	Username  string
	AuthType  string // "password" | "key"
	Secret    []byte // AES-GCM 加密后的密码或私钥内容
	KeyID     string
	CreatedAt int64
	UpdatedAt int64
}

func (db *DB) CreateHost(h *Host) error {
	h.ID = uuid.New().String()
	now := time.Now().Unix()
	h.CreatedAt = now
	h.UpdatedAt = now
	_, err := db.conn.Exec(
		`INSERT INTO hosts (id,name,group_name,host,port,username,auth_type,secret,key_id,created_at,updated_at)
		 VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
		h.ID, h.Name, h.GroupName, h.Host, h.Port, h.Username, h.AuthType, h.Secret, h.KeyID, h.CreatedAt, h.UpdatedAt,
	)
	return err
}

func (db *DB) ListHosts() ([]*Host, error) {
	rows, err := db.conn.Query(
		`SELECT id,name,group_name,host,port,username,auth_type,secret,key_id,created_at,updated_at
		 FROM hosts ORDER BY group_name, name`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var hosts []*Host
	for rows.Next() {
		h := &Host{}
		if err := rows.Scan(&h.ID, &h.Name, &h.GroupName, &h.Host, &h.Port, &h.Username, &h.AuthType, &h.Secret, &h.KeyID, &h.CreatedAt, &h.UpdatedAt); err != nil {
			return nil, err
		}
		hosts = append(hosts, h)
	}
	return hosts, rows.Err()
}

func (db *DB) GetHost(id string) (*Host, error) {
	h := &Host{}
	err := db.conn.QueryRow(
		`SELECT id,name,group_name,host,port,username,auth_type,secret,key_id,created_at,updated_at
		 FROM hosts WHERE id=?`, id,
	).Scan(&h.ID, &h.Name, &h.GroupName, &h.Host, &h.Port, &h.Username, &h.AuthType, &h.Secret, &h.KeyID, &h.CreatedAt, &h.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return h, err
}

func (db *DB) UpdateHost(h *Host) error {
	h.UpdatedAt = time.Now().Unix()
	_, err := db.conn.Exec(
		`UPDATE hosts SET name=?,group_name=?,host=?,port=?,username=?,auth_type=?,secret=?,key_id=?,updated_at=?
		 WHERE id=?`,
		h.Name, h.GroupName, h.Host, h.Port, h.Username, h.AuthType, h.Secret, h.KeyID, h.UpdatedAt, h.ID,
	)
	return err
}

func (db *DB) DeleteHost(id string) error {
	_, err := db.conn.Exec(`DELETE FROM hosts WHERE id=?`, id)
	return err
}
