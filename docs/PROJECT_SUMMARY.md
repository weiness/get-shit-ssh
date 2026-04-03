# get-shit-ssh (GSS) - Project Summary

**项目名称**: get-shit-ssh  
**简称**: gss  
**Git 仓库**: https://github.com/weiness/get-shit-ssh.git  
**技术栈**: Go + Wails v2 + React 18 + TypeScript + SQLite  
**当前日期**: 2026-04-03

---

## 项目概况

GSS 是一个 SSH 客户端/文件管理工具的桌面应用，支持：
- SSH 连接管理（密码 + 密钥认证）
- PTY 终端会话（交互式 shell）
- SFTP 文件传输
- 密钥生成与管理
- 会话历史与命令日志

---

## 阶段完成情况

### Phase 1 ✅ (完成)
- ✅ 主机配置管理（增删改查）
- ✅ 前端 UI 框架（AppShell、Menu、HostList）
- ✅ 主题系统（亮/暗）
- ✅ SQLite 数据库存储

**相关 Commit**:
- 主机管理 CRUD
- UI 组件框架
- 主题系统

### Phase 2 进度：3/14 任务完成

#### Task 1 ✅ SSH 客户端核心
**文件**: `internal/ssh/client.go`, `internal/ssh/client_test.go`

**实现**:
- `Session` struct: id, client *gossh.Client
- `Manager` struct: sessions map, encKey, dialer interface
- `NewManager(encKey []byte)` 构造函数
- `Connect(host *store.Host)` (string, error): 认证 + 连接
- `Get(sessionID string)` (*Session, bool): 获取会话
- `Close(sessionID string)` error: 关闭单个会话
- `CloseAll()`: 关闭所有会话

**认证支持**:
- 密码认证: SSH_AUTH_PASSWORD
- 密钥认证: 从 Host.Secret 中读取私钥内容

**测试覆盖**: 11 个测试，全部通过
- Connect with password/key
- Wrong password error
- Get/Close/CloseAll edge cases

**Commit**: a23a9e7 feat: add SSH session manager with password and key auth

---

#### Task 2 ✅ PTY 终端桥接
**文件**: `internal/ssh/terminal.go`, `internal/ssh/terminal_test.go`

**实现**:
- `TerminalSession` struct
  - id: 会话 ID
  - sshSess: *gossh.Session
  - stdin: io.WriteCloser (客户端→服务器)
  - outCh: chan []byte (服务器→客户端，buffered 256)
  - done: chan struct{} (信号关闭)
  - closeOnce: sync.Once (幂等关闭)

- **方法**:
  - `ID()` string: 返回会话 ID
  - `ReadChan()` <-chan []byte: 返回输出通道（供 goroutine 消费）
  - `Write(data []byte)` error: 写入用户输入
  - `Resize(rows, cols uint32)` error: 窗口大小调整
  - `Close()` error: 幂等关闭
  - `readerLoop()`: 后台 goroutine，持续读 stdout 并写入 outCh

- **OpenTerminal(sess *Session, rows, cols uint32)** (*TerminalSession, error)
  1. client.NewSession()
  2. RequestPty("xterm-256color", rows, cols, TerminalModes{ECHO, TTY_OP_ISPEED, TTY_OP_OSPEED})
  3. StdinPipe() / StdoutPipe()
  4. Shell()
  5. 启动 readerLoop 后台 goroutine
  6. 返回 TerminalSession

**关键设计**:
- 单向通道模式: 前端从 ReadChan() 读取，永远不写入（避免 goroutine 泄漏）
- sync.Once 确保 Close() 幂等，防止重复关闭资源
- 后台 reader goroutine 自动处理 EOF 和信号

**测试覆盖**: 5 个测试，全部通过
- Open, Read, Write, Resize, Close (idempotent)

**Commit**: 1700268 feat: add PTY terminal session with stdin/stdout bridging

---

#### Task 3 ✅ Wails Events 集成
**文件**: 
- `app.go` (后端 IPC)
- `frontend/src/stores/sessionStore.ts` (会话状态)
- `frontend/src/hooks/useTerminalIO.ts` (事件订阅)
- `frontend/src/components/Terminal/TerminalPane.tsx` (UI)
- `frontend/src/components/Host/HostList.tsx`, `HostItem.tsx` (集成)

**后端设计** (app.go):

```go
type App struct {
    ctx       context.Context
    db        *store.DB
    sshMgr    *ssh.Manager
    terminals sync.Map // termID -> *ssh.TerminalSession
    encKey    []byte   // 32 byte AES-GCM key (placeholder)
}
```

**IPC 方法**:
- `SSHConnect(hostID string)` (string, error): 连接主机，返回 sessionID
- `SSHDisconnect(sessionID string)` error: 断开连接
- `OpenTerminal(sessionID string, rows, cols uint32)` (string, error): 打开 PTY，启动 pumpTerminalOutput
- `TerminalInput(termID string, data string)` error: 用户输入
- `TerminalResize(termID string, rows, cols uint32)` error: 窗口大小
- `TerminalClose(termID string)` error: 关闭终端

**事件泵** (pumpTerminalOutput):
```go
func (a *App) pumpTerminalOutput(termID string, t *ssh.TerminalSession) {
    defer func() {
        a.terminals.Delete(termID)
        runtime.EventsEmit(a.ctx, "terminal:closed", termID)
    }()
    for data := range t.ReadChan() {
        runtime.EventsEmit(a.ctx, "terminal:data:"+termID, data)
    }
}
```

**事件契约**:
- `terminal:data:<termID>`: []byte payload (Wails 自动 base64 编码)
- `terminal:closed`: termID string

**前端设计**:

1. **sessionStore.ts** (Zustand)
   ```ts
   interface Session {
     id: string; hostName: string; termID: string; status: string
   }
   // connect(hostID, hostName) -> sessionID
   // openTerminal(sessionID, rows, cols) -> termID
   ```

2. **useTerminalIO.ts** Hook
   ```ts
   EventsOn('terminal:data:' + termID, (data) => term.write(new Uint8Array(data)))
   term.onData((input) => window.App.TerminalInput(termID, input))
   ```

3. **TerminalPane.tsx** 组件
   - 使用 `@xterm/xterm` + `@xterm/addon-fit`
   - FitAddon 自动匹配容器大小并触发 TerminalResize
   - 黑色 Catppuccin 主题，13px Menlo 字体

4. **HostList 集成**
   - 添加"连接"按钮到 HostItem
   - 点击触发 `handleConnect` 流程
   - 右侧分屏显示 TerminalPane
   - 关闭按钮隐藏终端面板

**依赖安装**:
```bash
npm add @xterm/xterm @xterm/addon-fit
```

**Commit**: 011121e feat: add Wails IPC integration for SSH/Terminal control

---

## 待完成任务

### Task 4: SFTP 文件管理器核心
**预期文件**: `internal/sftp/manager.go`, `internal/sftp/manager_test.go`
- SFTP 客户端初始化
- 文件列表/详情
- 上传/下载
- 删除/重命名

### Task 5-7: 文件管理 UI
- SFTPBrowser.tsx 组件
- FileTransfer.tsx 组件
- FileStore 状态管理

### Task 8-10: 密钥管理
- 密钥生成 (Ed25519/ECDSA)
- 密钥存储与加密
- KeyList/KeyForm UI

### Task 11-14: 高级功能
- 会话历史与命令日志
- 端口转发
- Host key 验证
- 应用打包与发布

---

## 关键设计模式

### 后端架构

```
App (Wails 绑定)
├── sshMgr (*ssh.Manager)
│   ├── Sessions map[sessionID]*Session
│   └── Dialer interface (可注入 mock)
├── terminals map[termID]*TerminalSession
│   └── ReadChan() -> pumpTerminalOutput goroutine
└── db (*store.DB)
    └── ListHosts/CreateHost/etc.
```

### 数据流

```
用户操作 (HostList)
  ↓
SSHConnect(hostID)
  → db.GetHost(hostID)
  → sshMgr.Connect(host)
  ↓
OpenTerminal(sessionID, rows, cols)
  → sshMgr.Get(sessionID)
  → ssh.OpenTerminal(sess, rows, cols)
  → terminals.Store(termID, termSess)
  → go pumpTerminalOutput(termID, termSess)
  ↓
pumpTerminalOutput (backend goroutine)
  → for data := range termSess.ReadChan()
  → runtime.EventsEmit(ctx, "terminal:data:"+termID, data)
  ↓
前端 EventsOn 订阅
  → EventsOn("terminal:data:"+termID, (data) => term.write(...))
  ↓
用户输入
  → term.onData((input) => TerminalInput(termID, input))
  → window.App.TerminalInput(termID, input)
  → termSess.Write([]byte(input))
```

### 幂等关闭

所有关闭操作都用 `sync.Once` 确保不会重复关闭资源：

```go
func (t *TerminalSession) Close() error {
    var retErr error
    t.closeOnce.Do(func() {
        close(t.done)
        t.stdin.Close()
        retErr = t.sshSess.Close()
        // drain outCh to unblock readerLoop
        for range t.outCh {}
    })
    return retErr
}
```

---

## 开发环境设置

### 前置条件
- Go 1.20+
- Node.js 16+ (npm/pnpm)
- Wails v2
- 目标远程 SSH 服务器（用于测试）

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/weiness/get-shit-ssh.git
cd get-shit-ssh

# 安装 Go 依赖
go mod download

# 安装前端依赖
cd frontend
npm install
cd ..

# 开发模式（需要 wails CLI）
wails dev

# 或使用 go run
go run github.com/wailsapp/wails/v2/cmd/wails@latest dev
```

### 构建生产版本

```bash
wails build -o gss.exe
```

---

## 数据库架构

### 表结构

**hosts 表**:
```sql
CREATE TABLE hosts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    group_name TEXT,
    host TEXT NOT NULL,
    port INTEGER NOT NULL,
    username TEXT NOT NULL,
    auth_type TEXT, -- 'password' | 'key'
    secret BLOB,    -- AES-GCM encrypted (password or private key)
    key_id TEXT,
    created_at INTEGER,
    updated_at INTEGER
)
```

**key_info 表** (Phase 3 后续):
```sql
CREATE TABLE key_info (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    key_type TEXT, -- 'ed25519' | 'ecdsa' | 'rsa'
    public_key TEXT,
    encrypted_private_key BLOB,
    created_at INTEGER
)
```

**session_logs 表** (Phase 3 后续):
```sql
CREATE TABLE session_logs (
    id TEXT PRIMARY KEY,
    host_id TEXT,
    session_id TEXT,
    command TEXT,
    output TEXT,
    start_time INTEGER,
    end_time INTEGER
)
```

---

## 已知限制 & TODO

### 安全性
- [ ] Host key 验证（当前：InsecureIgnoreHostKey）
- [ ] 加密密钥管理（当前：placeholder 零值）
- [ ] 敏感信息日志过滤

### 功能缺陷
- [ ] 多标签管理（多个终端）
- [ ] 连接超时与重试逻辑
- [ ] SFTP 断点续传

### 测试覆盖
- [ ] 前端集成测试（E2E）
- [ ] SFTP 上传/下载测试
- [ ] 大文件传输测试

---

## 下一步行动 (另一台电脑继续)

### 准备工作
1. 克隆仓库：
   ```bash
   git clone https://github.com/weiness/get-shit-ssh.git
   cd get-shit-ssh
   ```

2. 安装依赖：
   ```bash
   go mod download
   cd frontend && npm install && cd ..
   ```

3. 本地开发模式：
   ```bash
   go run github.com/wailsapp/wails/v2/cmd/wails@latest dev
   ```

### 接下来的任务
从 **Task 4: SFTP 文件管理器核心** 开始

参考实现计划：`docs/superpowers/plans/2026-04-03-phase2-ssh-core.md`

---

## 重要文件导览

```
gss/
├── app.go                          # Wails App 结构 + IPC 方法
├── main.go                         # Wails 入口
├── go.mod, go.sum                  # Go 依赖
├── wails.json                      # Wails 配置
│
├── internal/
│   ├── ssh/
│   │   ├── client.go              # SSH Manager (Task 1)
│   │   ├── client_test.go
│   │   ├── terminal.go            # PTY Session (Task 2)
│   │   ├── terminal_test.go
│   │   ├── sftp.go                # SFTP (Task 4, TBD)
│   │   └── sftp_test.go
│   └── store/
│       ├── hosts.go               # Host CRUD
│       ├── db.go                  # SQLite wrapper
│       ├── sessions.go            # Session logs (TBD)
│       └── keys.go                # Key management (TBD)
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── src/
│   │   ├── App.tsx                # 根组件
│   │   ├── main.tsx               # React 入口
│   │   ├── stores/
│   │   │   ├── hostStore.ts       # Host CRUD (Phase 1)
│   │   │   ├── sessionStore.ts    # SSH Sessions (Task 3)
│   │   │   ├── fileStore.ts       # SFTP (Task 5, TBD)
│   │   │   └── keyStore.ts        # Keys (Task 8, TBD)
│   │   ├── hooks/
│   │   │   ├── useTerminalIO.ts   # Terminal Events (Task 3)
│   │   │   ├── useFileTransfer.ts # SFTP (Task 5, TBD)
│   │   │   └── useSSHSession.ts   # Connection (Task 3, partial)
│   │   ├── components/
│   │   │   ├── Layout/AppShell.tsx
│   │   │   ├── Menu/AppMenu.tsx
│   │   │   ├── Host/
│   │   │   │   ├── HostList.tsx
│   │   │   │   ├── HostItem.tsx
│   │   │   │   └── HostForm.tsx
│   │   │   ├── Terminal/
│   │   │   │   ├── TerminalPane.tsx (Task 3)
│   │   │   │   ├── TerminalPane.module.css
│   │   │   │   └── TerminalTabBar.tsx (TBD)
│   │   │   ├── FileManager/
│   │   │   │   ├── SFTPBrowser.tsx (Task 5, TBD)
│   │   │   │   └── FileTransfer.tsx (Task 5, TBD)
│   │   │   └── KeyManager/
│   │   │       ├── KeyList.tsx (Task 8, TBD)
│   │   │       └── KeyForm.tsx (Task 8, TBD)
│   │   └── types/
│   │       ├── host.ts
│   │       ├── session.ts (TBD)
│   │       ├── sftp.ts (TBD)
│   │       └── key.ts (TBD)
│   └── dist/                       # 编译输出
│
├── docs/
│   ├── superpowers/
│   │   └── plans/
│   │       └── 2026-04-03-phase2-ssh-core.md
│   └── PROJECT_SUMMARY.md          # 本文件
└── README.md
```

---

## 版本信息

- **当前版本**: Phase 2 - Task 3/14
- **Commit 历史**:
  - a23a9e7: SSH 客户端核心
  - 1700268: PTY 终端桥接
  - 011121e: Wails IPC 集成

---

**文档生成日期**: 2026-04-03  
**下次更新**: 完成 Task 4 后
