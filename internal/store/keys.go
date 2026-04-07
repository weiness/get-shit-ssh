package store

import (
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
)

// KeyInfo holds metadata about a stored SSH key pair.
// The encrypted private key is stored separately (not in this struct).
type KeyInfo struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	PublicKey string `json:"publicKey"` // OpenSSH authorized_keys format
	CreatedAt int64  `json:"createdAt"`
}

// SaveKey stores an SSH key pair. privateKey must be AES-GCM encrypted.
func (db *DB) SaveKey(name, publicKey string, privateKey []byte) (*KeyInfo, error) {
	k := &KeyInfo{
		ID:        uuid.New().String(),
		Name:      name,
		PublicKey: publicKey,
		CreatedAt: time.Now().Unix(),
	}
	_, err := db.conn.Exec(
		`INSERT INTO keys (id, name, public_key, private_key, created_at) VALUES (?,?,?,?,?)`,
		k.ID, k.Name, k.PublicKey, privateKey, k.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return k, nil
}

// ListKeys returns all stored keys (without private key data).
func (db *DB) ListKeys() ([]*KeyInfo, error) {
	rows, err := db.conn.Query(
		`SELECT id, name, public_key, created_at FROM keys ORDER BY created_at DESC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var keys []*KeyInfo
	for rows.Next() {
		k := &KeyInfo{}
		if err := rows.Scan(&k.ID, &k.Name, &k.PublicKey, &k.CreatedAt); err != nil {
			return nil, err
		}
		keys = append(keys, k)
	}
	return keys, rows.Err()
}

// GetKey retrieves a key by ID including the encrypted private key.
func (db *DB) GetKey(id string) (*KeyInfo, []byte, error) {
	k := &KeyInfo{}
	var privateKey []byte
	err := db.conn.QueryRow(
		`SELECT id, name, public_key, private_key, created_at FROM keys WHERE id=?`, id,
	).Scan(&k.ID, &k.Name, &k.PublicKey, &privateKey, &k.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil, nil
	}
	if err != nil {
		return nil, nil, err
	}
	return k, privateKey, nil
}

// DeleteKey removes a key by ID.
func (db *DB) DeleteKey(id string) error {
	_, err := db.conn.Exec(`DELETE FROM keys WHERE id=?`, id)
	return err
}
