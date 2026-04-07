package store

import (
	"time"

	"github.com/google/uuid"
)

// SessionLog records a completed SSH connection.
type SessionLog struct {
	ID         string `json:"id"`
	HostID     string `json:"hostId"`
	HostName   string `json:"hostName"`
	Username   string `json:"username"`
	Address    string `json:"address"`
	ConnectedAt int64 `json:"connectedAt"`
	Duration   int64  `json:"duration"` // seconds; 0 while active
}

func (db *DB) LogSessionStart(hostID, hostName, username, address string) (*SessionLog, error) {
	s := &SessionLog{
		ID:          uuid.New().String(),
		HostID:      hostID,
		HostName:    hostName,
		Username:    username,
		Address:     address,
		ConnectedAt: time.Now().Unix(),
	}
	_, err := db.conn.Exec(
		`INSERT INTO session_logs (id, host_id, host_name, username, address, connected_at, duration)
		 VALUES (?,?,?,?,?,?,0)`,
		s.ID, s.HostID, s.HostName, s.Username, s.Address, s.ConnectedAt,
	)
	if err != nil {
		return nil, err
	}
	return s, nil
}

func (db *DB) LogSessionEnd(id string) error {
	_, err := db.conn.Exec(
		`UPDATE session_logs SET duration = (strftime('%s','now') - connected_at) WHERE id = ?`, id,
	)
	return err
}

func (db *DB) ListSessionLogs(limit int) ([]*SessionLog, error) {
	rows, err := db.conn.Query(
		`SELECT id, host_id, host_name, username, address, connected_at, duration
		 FROM session_logs ORDER BY connected_at DESC LIMIT ?`, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []*SessionLog
	for rows.Next() {
		s := &SessionLog{}
		if err := rows.Scan(&s.ID, &s.HostID, &s.HostName, &s.Username, &s.Address, &s.ConnectedAt, &s.Duration); err != nil {
			return nil, err
		}
		logs = append(logs, s)
	}
	return logs, rows.Err()
}

func (db *DB) ClearSessionLogs() error {
	_, err := db.conn.Exec(`DELETE FROM session_logs`)
	return err
}
