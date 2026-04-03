# GSS Phase 1: 基础骨架 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建 Wails 项目骨架，实现本地 SQLite 主机配置管理，完成左侧主机列表 UI 和右上角菜单（含主题切换）。

**Architecture:** Go 后端通过 Wails IPC 暴露方法给 React 前端。SQLite 存储主机配置，敏感字段 AES-GCM 加密。前端使用 Zustand 管理状态，Tailwind CSS v4 实现亮/暗双主题。

**Tech Stack:** Go 1.22+, Wails v2, React 18, TypeScript, Tailwind CSS v4, Zustand, modernc.org/sqlite, lucide-react

---

## 文件结构

```
gss/
├── main.go
├── app.go
├── internal/
│   ├── store/
│   │   ├── db.go
│   │   ├── hosts.go
│   │   └── hosts_test.go
│   └── crypto/
│       ├── vault.go
│       └── vault_test.go
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── components/
│   │   │   ├── Layout/AppShell.tsx
│   │   │   ├── HostList/HostList.tsx
│   │   │   ├── HostList/HostItem.tsx
│   │   │   ├── HostList/HostForm.tsx
│   │   │   ├── HostList/ContextMenu.tsx
│   │   │   └── Menu/AppMenu.tsx
│   │   ├── stores/
│   │   │   ├── hostStore.ts
│   │   │   └── themeStore.ts
│   │   ├── types/host.ts
│   │   └── styles/themes.css
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── wails.json
├── go.mod
└── go.sum
```

---

## Task 1: 初始化 Wails 项目

**Files:**
- Create: `main.go`
- Create: `app.go`
- Create: `wails.json`
- Create: `go.mod`

- [ ] **Step 1: 安装 Wails CLI**

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
wails version
```

Expected output: `Wails CLI v2.x.x`

- [ ] **Step 2: 初始化项目**

```bash
cd D:/code/github/gss
wails init -n gss -t react-ts
```

这会生成基础项目结构。生成后检查 `wails.json` 确认配置正确。

- [ ] **Step 3: 替换 `wails.json` 为项目配置**

```json
{
  "$schema": "https://wails.io/schemas/config.v2.json",
  "name": "gss",
  "outputfilename": "gss",
  "frontend:install": "npm install",
  "frontend:build": "npm run build",
  "frontend:dev:watcher": "npm run dev",
  "frontend:dev:serverUrl": "auto",
  "author": {
    "name": "gss"
  }
}
```

- [ ] **Step 4: 添加 Go 依赖**

```bash
go get modernc.org/sqlite
go get github.com/google/uuid
go mod tidy
```

- [ ] **Step 5: 替换 `main.go`**

```go
package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app := NewApp()

	err := wails.Run(&options.App{
		Title:  "GSS",
		Width:  1200,
		Height: 800,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 30, G: 30, B: 46, A: 1},
		OnStartup:        app.startup,
		OnShutdown:       app.shutdown,
		Bind: []interface{}{
			app,
		},
	})
	if err != nil {
		println("Error:", err.Error())
	}
}
```

- [ ] **Step 6: 替换 `app.go`**

```go
package main

import (
	"context"

	"github.com/your-username/gss/internal/store"
)

type App struct {
	ctx context.Context
	db  *store.DB
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
}

func (a *App) shutdown(ctx context.Context) {
	if a.db != nil {
		a.db.Close()
	}
}
```

> 注意：将 `github.com/your-username/gss` 替换为 `go.mod` 中实际的 module 名。

- [ ] **Step 7: 验证项目可编译**

```bash
wails build
```

Expected: 编译成功，`build/bin/` 下生成可执行文件。

- [ ] **Step 8: Commit**

```bash
git init
git add .
git commit -m "feat: initialize Wails project with React-TS template"
```

---

## Task 2: AES-GCM 加密 Vault

**Files:**
- Create: `internal/crypto/vault.go`
- Create: `internal/crypto/vault_test.go`

- [ ] **Step 1: 编写失败测试**

创建 `internal/crypto/vault_test.go`：

```go
package crypto_test

import (
	"testing"

	"github.com/your-username/gss/internal/crypto"
)

func TestEncryptDecrypt(t *testing.T) {
	key := make([]byte, 32) // 全零密钥，仅用于测试
	plaintext := []byte("super-secret-password")

	ciphertext, err := crypto.Encrypt(key, plaintext)
	if err != nil {
		t.Fatalf("Encrypt failed: %v", err)
	}
	if len(ciphertext) == 0 {
		t.Fatal("ciphertext is empty")
	}

	decrypted, err := crypto.Decrypt(key, ciphertext)
	if err != nil {
		t.Fatalf("Decrypt failed: %v", err)
	}
	if string(decrypted) != string(plaintext) {
		t.Fatalf("expected %q, got %q", plaintext, decrypted)
	}
}

func TestDecryptWrongKey(t *testing.T) {
	key := make([]byte, 32)
	wrongKey := make([]byte, 32)
	wrongKey[0] = 0xFF

	ciphertext, _ := crypto.Encrypt(key, []byte("secret"))
	_, err := crypto.Decrypt(wrongKey, ciphertext)
	if err == nil {
		t.Fatal("expected error with wrong key, got nil")
	}
}
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd D:/code/github/gss
go test ./internal/crypto/...
```

Expected: FAIL — `package crypto not found`

- [ ] **Step 3: 实现 `internal/crypto/vault.go`**

```go
package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"errors"
	"io"
)

// Encrypt 使用 AES-GCM 加密 plaintext，返回 nonce+ciphertext
func Encrypt(key, plaintext []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, err
	}
	return gcm.Seal(nonce, nonce, plaintext, nil), nil
}

// Decrypt 解密 Encrypt 返回的数据
func Decrypt(key, ciphertext []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	if len(ciphertext) < gcm.NonceSize() {
		return nil, errors.New("ciphertext too short")
	}
	nonce, ciphertext := ciphertext[:gcm.NonceSize()], ciphertext[gcm.NonceSize():]
	return gcm.Open(nil, nonce, ciphertext, nil)
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
go test ./internal/crypto/... -v
```

Expected:
```
--- PASS: TestEncryptDecrypt
--- PASS: TestDecryptWrongKey
PASS
```

- [ ] **Step 5: Commit**

```bash
git add internal/crypto/
git commit -m "feat: add AES-GCM vault for sensitive field encryption"
```

---

## Task 3: SQLite 数据库初始化

**Files:**
- Create: `internal/store/db.go`

- [ ] **Step 1: 创建 `internal/store/db.go`**

```go
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
	dir, err := dataDir()
	if err != nil {
		return nil, err
	}
	if err := os.MkdirAll(dir, 0700); err != nil {
		return nil, err
	}
	dbPath := filepath.Join(dir, "gss.db")
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
```

- [ ] **Step 2: 验证编译**

```bash
go build ./...
```

Expected: 无错误输出。

- [ ] **Step 3: Commit**

```bash
git add internal/store/db.go
git commit -m "feat: add SQLite store with schema migration"
```

---

## Task 4: 主机配置 CRUD

**Files:**
- Create: `internal/store/hosts.go`
- Create: `internal/store/hosts_test.go`

- [ ] **Step 1: 定义类型并编写失败测试**

创建 `internal/store/hosts_test.go`：

```go
package store_test

import (
	"os"
	"testing"
	"time"

	"github.com/your-username/gss/internal/store"
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
```

- [ ] **Step 2: 运行测试确认失败**

```bash
go test ./internal/store/... -v
```

Expected: FAIL — `db.CreateHost undefined`

- [ ] **Step 3: 实现 `internal/store/hosts.go`**

```go
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
```

- [ ] **Step 4: 更新 `internal/store/db.go` 支持内存数据库测试**

在 `New()` 函数开头添加环境变量检查：

```go
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
	// ... 其余不变
```

- [ ] **Step 5: 运行测试确认通过**

```bash
go test ./internal/store/... -v
```

Expected:
```
--- PASS: TestHostCRUD
PASS
```

- [ ] **Step 6: Commit**

```bash
git add internal/store/
git commit -m "feat: add host CRUD with SQLite storage"
```

---

## Task 5: App 层暴露主机管理 API 给前端

**Files:**
- Modify: `app.go`

- [ ] **Step 1: 更新 `app.go` 添加主机管理方法**

```go
package main

import (
	"context"

	"github.com/your-username/gss/internal/store"
)

type App struct {
	ctx context.Context
	db  *store.DB
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
}

func (a *App) shutdown(ctx context.Context) {
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
```

- [ ] **Step 2: 验证编译**

```bash
go build ./...
```

Expected: 无错误。

- [ ] **Step 3: Commit**

```bash
git add app.go
git commit -m "feat: expose host management API to frontend via Wails"
```

---

## Task 6: 前端依赖安装与基础配置

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.ts`
- Modify: `frontend/tsconfig.json`
- Create: `frontend/src/styles/themes.css`

- [ ] **Step 1: 安装前端依赖**

```bash
cd frontend
npm install zustand lucide-react
npm install -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 2: 更新 `frontend/vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

- [ ] **Step 3: 创建 `frontend/src/styles/themes.css`**

```css
@import "tailwindcss";

:root {
  --bg-primary: #F5F5F5;
  --bg-sidebar: #EBEBEB;
  --bg-terminal: #FFFFFF;
  --text-primary: #1a1a1a;
  --text-secondary: #555555;
  --accent: #0066CC;
  --border: #D0D0D0;
  --item-hover: #DCDCDC;
  --menu-bg: #FFFFFF;
}

:root[data-theme="dark"] {
  --bg-primary: #1E1E2E;
  --bg-sidebar: #181825;
  --bg-terminal: #11111B;
  --text-primary: #CDD6F4;
  --text-secondary: #A6ADC8;
  --accent: #89B4FA;
  --border: #313244;
  --item-hover: #313244;
  --menu-bg: #1E1E2E;
}

body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-family: system-ui, -apple-system, sans-serif;
}
```

- [ ] **Step 4: 更新 `frontend/src/main.tsx` 引入样式**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/themes.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 5: 验证前端构建**

```bash
npm run build
```

Expected: `dist/` 目录生成，无错误。

- [ ] **Step 6: Commit**

```bash
cd ..
git add frontend/
git commit -m "feat: configure Tailwind v4, themes CSS variables, Zustand"
```

---

## Task 7: 主题 Store

**Files:**
- Create: `frontend/src/stores/themeStore.ts`

- [ ] **Step 1: 创建 `frontend/src/stores/themeStore.ts`**

```ts
import { create } from 'zustand'

type Theme = 'dark' | 'light'

interface ThemeStore {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const applyTheme = (theme: Theme) => {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('gss-theme', theme)
}

const savedTheme = (localStorage.getItem('gss-theme') as Theme) ?? 'dark'
applyTheme(savedTheme)

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: savedTheme,
  setTheme: (theme) => {
    applyTheme(theme)
    set({ theme })
  },
}))
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/stores/themeStore.ts
git commit -m "feat: add theme store with localStorage persistence"
```

---

## Task 8: Host 类型定义与 Store

**Files:**
- Create: `frontend/src/types/host.ts`
- Create: `frontend/src/stores/hostStore.ts`

- [ ] **Step 1: 创建 `frontend/src/types/host.ts`**

```ts
export interface Host {
  id: string
  name: string
  groupName: string
  host: string
  port: number
  username: string
  authType: 'password' | 'key'
  keyId: string
  createdAt: number
  updatedAt: number
}
```

- [ ] **Step 2: 创建 `frontend/src/stores/hostStore.ts`**

```ts
import { create } from 'zustand'
import { Host } from '../types/host'
import {
  ListHosts,
  CreateHost,
  UpdateHost,
  DeleteHost,
} from '../../wailsjs/go/main/App'

interface HostStore {
  hosts: Host[]
  loading: boolean
  fetchHosts: () => Promise<void>
  createHost: (h: Omit<Host, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateHost: (h: Host) => Promise<void>
  deleteHost: (id: string) => Promise<void>
}

export const useHostStore = create<HostStore>((set, get) => ({
  hosts: [],
  loading: false,

  fetchHosts: async () => {
    set({ loading: true })
    const hosts = await ListHosts()
    set({ hosts: hosts ?? [], loading: false })
  },

  createHost: async (h) => {
    await CreateHost(h as Host)
    await get().fetchHosts()
  },

  updateHost: async (h) => {
    await UpdateHost(h)
    await get().fetchHosts()
  },

  deleteHost: async (id) => {
    await DeleteHost(id)
    set((s) => ({ hosts: s.hosts.filter((h) => h.id !== id) }))
  },
}))
```

> 注意：`wailsjs/go/main/App` 是 Wails 自动生成的绑定，需先运行 `wails dev` 生成。

- [ ] **Step 3: 生成 Wails 绑定**

```bash
wails dev
# 启动后 Ctrl+C 退出，此时 frontend/wailsjs/ 目录已生成
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/ frontend/src/stores/hostStore.ts frontend/wailsjs/
git commit -m "feat: add host types, store, and Wails generated bindings"
```

---

## Task 9: 右上角菜单组件

**Files:**
- Create: `frontend/src/components/Menu/AppMenu.tsx`

- [ ] **Step 1: 创建 `frontend/src/components/Menu/AppMenu.tsx`**

```tsx
import { useState, useRef, useEffect } from 'react'
import { Menu, Sun, Moon, HelpCircle, Info, ChevronRight, Check } from 'lucide-react'
import { useThemeStore } from '../../stores/themeStore'

export function AppMenu() {
  const [open, setOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { theme, setTheme } = useThemeStore()

  // 点击外部关闭菜单
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setThemeOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '6px 8px',
          borderRadius: '6px',
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Menu size={20} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '4px',
            background: 'var(--menu-bg)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            minWidth: '180px',
            zIndex: 1000,
            padding: '4px 0',
          }}
        >
          {/* 主题子菜单 */}
          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => setThemeOpen(true)}
            onMouseLeave={() => setThemeOpen(false)}
          >
            <MenuItem icon={<Sun size={15} />} label="主题" rightIcon={<ChevronRight size={14} />} />
            {themeOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: '100%',
                  marginRight: '4px',
                  background: 'var(--menu-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                  minWidth: '120px',
                  padding: '4px 0',
                }}
              >
                <MenuItem
                  icon={theme === 'dark' ? <Check size={15} /> : <span style={{ width: 15 }} />}
                  label="暗色"
                  onClick={() => { setTheme('dark'); setOpen(false) }}
                />
                <MenuItem
                  icon={theme === 'light' ? <Check size={15} /> : <span style={{ width: 15 }} />}
                  label="亮色"
                  onClick={() => { setTheme('light'); setOpen(false) }}
                />
              </div>
            )}
          </div>

          <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />

          <MenuItem
            icon={<HelpCircle size={15} />}
            label="帮助"
            onClick={() => {
              window.open('https://github.com/your-username/gss', '_blank')
              setOpen(false)
            }}
          />
          <MenuItem
            icon={<Info size={15} />}
            label="关于"
            onClick={() => {
              alert('GSS v0.1.0\nGo + Wails SSH Client')
              setOpen(false)
            }}
          />
        </div>
      )}
    </div>
  )
}

function MenuItem({
  icon,
  label,
  rightIcon,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  rightIcon?: React.ReactNode
  onClick?: () => void
}) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '7px 12px',
        cursor: 'pointer',
        background: hover ? 'var(--item-hover)' : 'transparent',
        color: 'var(--text-primary)',
        fontSize: '14px',
        justifyContent: 'space-between',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {icon}
        {label}
      </span>
      {rightIcon}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/Menu/
git commit -m "feat: add app menu with theme switcher (dark/light)"
```

---

## Task 10: 主机列表组件

**Files:**
- Create: `frontend/src/components/HostList/HostList.tsx`
- Create: `frontend/src/components/HostList/HostItem.tsx`
- Create: `frontend/src/components/HostList/HostForm.tsx`
- Create: `frontend/src/components/HostList/ContextMenu.tsx`

- [ ] **Step 1: 创建 `frontend/src/components/HostList/ContextMenu.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react'

interface ContextMenuProps {
  x: number
  y: number
  onConnect: () => void
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
}

export function ContextMenu({ x, y, onConnect, onEdit, onDelete, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: y,
        left: x,
        background: 'var(--menu-bg)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        zIndex: 2000,
        padding: '4px 0',
        minWidth: '140px',
      }}
    >
      <CMenuItem label="连接" onClick={() => { onConnect(); onClose() }} />
      <CMenuItem label="编辑" onClick={() => { onEdit(); onClose() }} />
      <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
      <CMenuItem label="删除" onClick={() => { onDelete(); onClose() }} danger />
    </div>
  )
}

function CMenuItem({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '7px 14px',
        cursor: 'pointer',
        fontSize: '14px',
        color: danger ? '#f38ba8' : 'var(--text-primary)',
        background: hover ? 'var(--item-hover)' : 'transparent',
      }}
    >
      {label}
    </div>
  )
}
```

- [ ] **Step 2: 创建 `frontend/src/components/HostList/HostForm.tsx`**

```tsx
import { useState } from 'react'
import { Host } from '../../types/host'
import { X } from 'lucide-react'

type FormData = Omit<Host, 'id' | 'createdAt' | 'updatedAt'>

const defaultForm: FormData = {
  name: '',
  groupName: '',
  host: '',
  port: 22,
  username: '',
  authType: 'password',
  keyId: '',
}

interface HostFormProps {
  initial?: Host
  onSubmit: (data: FormData) => void
  onCancel: () => void
}

export function HostForm({ initial, onSubmit, onCancel }: HostFormProps) {
  const [form, setForm] = useState<FormData>(
    initial
      ? { name: initial.name, groupName: initial.groupName, host: initial.host,
          port: initial.port, username: initial.username, authType: initial.authType, keyId: initial.keyId }
      : defaultForm
  )

  const field = (key: keyof FormData) => ({
    value: form[key] as string | number,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: key === 'port' ? Number(e.target.value) : e.target.value })),
  })

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '6px 10px', borderRadius: '6px',
    border: '1px solid var(--border)', background: 'var(--bg-primary)',
    color: 'var(--text-primary)', fontSize: '14px', boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--text-secondary)',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000,
    }}>
      <div style={{
        background: 'var(--menu-bg)', borderRadius: '10px', padding: '24px',
        width: '420px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '16px' }}>{initial ? '编辑主机' : '新建主机'}</h2>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={labelStyle}>名称</label>
            <input style={inputStyle} {...field('name')} placeholder="My Server" />
          </div>
          <div>
            <label style={labelStyle}>分组</label>
            <input style={inputStyle} {...field('groupName')} placeholder="生产环境" />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>主机地址</label>
              <input style={inputStyle} {...field('host')} placeholder="192.168.1.1" />
            </div>
            <div style={{ width: '80px' }}>
              <label style={labelStyle}>端口</label>
              <input style={inputStyle} type="number" {...field('port')} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>用户名</label>
            <input style={inputStyle} {...field('username')} placeholder="root" />
          </div>
          <div>
            <label style={labelStyle}>认证方式</label>
            <select style={inputStyle} {...field('authType')}>
              <option value="password">密码</option>
              <option value="key">密钥</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
          <button onClick={onCancel} style={{
            padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '14px',
          }}>
            取消
          </button>
          <button
            onClick={() => form.name && form.host && form.username && onSubmit(form)}
            style={{
              padding: '8px 16px', borderRadius: '6px', border: 'none',
              background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: '14px',
            }}
          >
            {initial ? '保存' : '创建'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 创建 `frontend/src/components/HostList/HostItem.tsx`**

```tsx
import { useState } from 'react'
import { Monitor } from 'lucide-react'
import { Host } from '../../types/host'
import { ContextMenu } from './ContextMenu'

interface HostItemProps {
  host: Host
  onConnect: (host: Host) => void
  onEdit: (host: Host) => void
  onDelete: (id: string) => void
}

export function HostItem({ host, onConnect, onEdit, onDelete }: HostItemProps) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const [hover, setHover] = useState(false)

  return (
    <>
      <div
        onDoubleClick={() => onConnect(host)}
        onContextMenu={(e) => {
          e.preventDefault()
          setMenu({ x: e.clientX, y: e.clientY })
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '6px 12px', cursor: 'pointer', fontSize: '13px',
          background: hover ? 'var(--item-hover)' : 'transparent',
          color: 'var(--text-primary)', borderRadius: '4px',
          margin: '1px 4px',
        }}
      >
        <Monitor size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {host.name}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-secondary)', flexShrink: 0 }}>
          {host.username}@{host.host}
        </span>
      </div>

      {menu && (
        <ContextMenu
          x={menu.x} y={menu.y}
          onConnect={() => onConnect(host)}
          onEdit={() => onEdit(host)}
          onDelete={() => onDelete(host.id)}
          onClose={() => setMenu(null)}
        />
      )}
    </>
  )
}
```

- [ ] **Step 4: 创建 `frontend/src/components/HostList/HostList.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Search, Plus } from 'lucide-react'
import { useHostStore } from '../../stores/hostStore'
import { Host } from '../../types/host'
import { HostItem } from './HostItem'
import { HostForm } from './HostForm'

interface HostListProps {
  onConnect: (host: Host) => void
}

export function HostList({ onConnect }: HostListProps) {
  const { hosts, fetchHosts, createHost, updateHost, deleteHost } = useHostStore()
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [formHost, setFormHost] = useState<Host | null | 'new'>(null)

  useEffect(() => { fetchHosts() }, [])

  const filtered = hosts.filter(
    (h) =>
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.host.toLowerCase().includes(search.toLowerCase())
  )

  // 按分组聚合
  const groups = filtered.reduce<Record<string, Host[]>>((acc, h) => {
    const g = h.groupName || '默认'
    if (!acc[g]) acc[g] = []
    acc[g].push(h)
    return acc
  }, {})

  const toggleGroup = (g: string) =>
    setCollapsed((c) => ({ ...c, [g]: !c[g] }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 搜索栏 */}
      <div style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'var(--bg-primary)', border: '1px solid var(--border)',
          borderRadius: '6px', padding: '5px 8px',
        }}>
          <Search size={14} style={{ color: 'var(--text-secondary)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索主机..."
            style={{
              border: 'none', background: 'transparent', outline: 'none',
              fontSize: '13px', color: 'var(--text-primary)', flex: 1,
            }}
          />
        </div>
      </div>

      {/* 主机列表 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {Object.entries(groups).map(([group, items]) => (
          <div key={group}>
            <div
              onClick={() => toggleGroup(group)}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '5px 10px', cursor: 'pointer', fontSize: '12px',
                color: 'var(--text-secondary)', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}
            >
              {collapsed[group]
                ? <ChevronRight size={12} />
                : <ChevronDown size={12} />}
              {group}
              <span style={{ marginLeft: 'auto' }}>{items.length}</span>
            </div>
            {!collapsed[group] && items.map((h) => (
              <HostItem
                key={h.id}
                host={h}
                onConnect={onConnect}
                onEdit={(h) => setFormHost(h)}
                onDelete={deleteHost}
              />
            ))}
          </div>
        ))}
      </div>

      {/* 底部按钮 */}
      <div style={{ padding: '8px', borderTop: '1px solid var(--border)' }}>
        <button
          onClick={() => setFormHost('new')}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '6px', width: '100%', padding: '7px',
            background: 'var(--accent)', color: '#fff', border: 'none',
            borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
          }}
        >
          <Plus size={14} /> 新建主机
        </button>
      </div>

      {/* 弹窗 */}
      {formHost === 'new' && (
        <HostForm
          onSubmit={(data) => { createHost(data); setFormHost(null) }}
          onCancel={() => setFormHost(null)}
        />
      )}
      {formHost && formHost !== 'new' && (
        <HostForm
          initial={formHost}
          onSubmit={(data) => { updateHost({ ...formHost, ...data }); setFormHost(null) }}
          onCancel={() => setFormHost(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/HostList/
git commit -m "feat: add host list UI with groups, search, and CRUD forms"
```

---

## Task 11: 整体布局 AppShell

**Files:**
- Create: `frontend/src/components/Layout/AppShell.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: 创建 `frontend/src/components/Layout/AppShell.tsx`**

```tsx
import { Host } from '../../types/host'
import { HostList } from '../HostList/HostList'
import { AppMenu } from '../Menu/AppMenu'

interface AppShellProps {
  onConnect: (host: Host) => void
}

export function AppShell({ onConnect }: AppShellProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* 顶栏 */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '0 12px',
        height: '48px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-sidebar)', flexShrink: 0,
        WebkitAppRegion: 'drag',  // 允许拖动窗口
      } as React.CSSProperties}>
        <span style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '0.05em' }}>GSS</span>
        <div style={{ marginLeft: 'auto', WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <AppMenu />
        </div>
      </div>

      {/* 主体 */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 左侧主机列表 */}
        <div style={{
          width: '240px', flexShrink: 0,
          background: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
        }}>
          <HostList onConnect={onConnect} />
        </div>

        {/* 主内容区（后续接终端/SFTP） */}
        <div style={{ flex: 1, background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>双击主机开始连接</span>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 更新 `frontend/src/App.tsx`**

```tsx
import { AppShell } from './components/Layout/AppShell'
import { Host } from './types/host'

function App() {
  const handleConnect = (host: Host) => {
    // Phase 2 实现终端连接
    console.log('connect to', host)
  }

  return <AppShell onConnect={handleConnect} />
}

export default App
```

- [ ] **Step 3: 验证前端构建**

```bash
cd frontend && npm run build
```

Expected: 无错误，`dist/` 生成。

- [ ] **Step 4: 运行 dev 模式验证 UI**

```bash
cd .. && wails dev
```

Expected: 应用窗口打开，左侧显示主机列表，右上角有 ☰ 菜单，主题切换有效。

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Layout/ frontend/src/App.tsx
git commit -m "feat: add AppShell layout with sidebar and topbar"
```

---

## Task 12: 最终构建验证

- [ ] **Step 1: 运行所有 Go 测试**

```bash
go test ./... -v
```

Expected: 所有测试 PASS。

- [ ] **Step 2: Windows 生产构建**

```bash
wails build -platform windows/amd64 -clean
```

Expected: `build/bin/gss.exe` 生成，大小 < 25MB。

- [ ] **Step 3: macOS 生产构建（在 macOS 机器上执行）**

```bash
wails build -platform darwin/universal -clean
```

Expected: `build/bin/gss.app` 生成，大小 < 20MB。

- [ ] **Step 4: Commit**

```bash
git tag v0.1.0-phase1
git commit -m "chore: phase 1 complete — foundation, host management, theme UI"
```

---

## 自检：Spec 覆盖率

| Spec 需求 | 覆盖任务 |
|-----------|---------|
| Wails 项目初始化 | Task 1 |
| AES-GCM 加密 | Task 2 |
| SQLite 数据库 + 迁移 | Task 3 |
| 主机 CRUD | Task 4 |
| App API 暴露给前端 | Task 5 |
| Tailwind + 双主题 | Task 6, 7 |
| 主机类型 + Store | Task 8 |
| 右上角菜单（主题/帮助/关于）| Task 9 |
| 主机列表 UI（分组/搜索/右键）| Task 10 |
| 整体布局骨架 | Task 11 |
| 构建验证 | Task 12 |
