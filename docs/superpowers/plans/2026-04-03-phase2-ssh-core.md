# GSS Phase 2: SSH 核心功能 Implementation Plan

> **Goal:** 实现 SSH 终端连接、多标签管理、SFTP 文件传输、密钥管理的完整流程。  
> **Estimated complexity:** 12-15 tasks

**Phase 1 交付物：** 
- ✅ 主机配置管理（增删改查）
- ✅ 前端 UI 框架（AppShell、Menu、HostList）
- ✅ 主题系统（亮/暗）
- ✅ 15MB 可执行文件

**Phase 2 目标：**
- SSH 连接生命周期管理（连接、认证、断开）
- 终端界面（xterm.js + PTY 桥接）
- 多标签管理（活跃会话列表）
- SFTP 文件管理器
- 密钥生成与管理
- 会话持久化（连接历史、命令日志）

---

## 架构概览

```
后端核心流：
  主机配置 (Host) 
    → SSH 客户端初始化 (Client)
    → 认证 (Auth: Password/Key)
    → PTY 会话 (Terminal)
    → I/O 通道 (Wails Events)
    → 前端渲染 (React Terminal)

文件传输流：
  主机配置 → SFTP 客户端 → 本地/远程文件系统
  
密钥流：
  生成 (Ed25519/ECDSA) → 加密存储 → 使用认证
```

---

## 文件结构新增

```
gss/
├── internal/
│   ├── ssh/
│   │   ├── client.go        # SSH 连接管理（NEW）
│   │   ├── client_test.go
│   │   ├── terminal.go      # PTY + stdin/stdout（NEW）
│   │   ├── terminal_test.go
│   │   ├── sftp.go          # SFTP 操作（NEW）
│   │   ├── sftp_test.go
│   │   ├── keymgr.go        # 密钥生成/管理（NEW）
│   │   ├── keymgr_test.go
│   │   └── tunnel.go        # 端口转发（可选 Phase 2.5）
│   ├── store/
│   │   ├── sessions.go      # 会话持久化表（NEW）
│   │   └── keys.go          # 密钥表（NEW）
│   └── ...
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Terminal/
│   │   │   │   ├── TerminalTab.tsx       # 单个标签（NEW）
│   │   │   │   ├── TerminalTabBar.tsx    # 标签栏（NEW）
│   │   │   │   └── TerminalPanel.tsx     # 主面板（NEW）
│   │   │   ├── FileManager/
│   │   │   │   ├── SFTPBrowser.tsx       # SFTP 浏览器（NEW）
│   │   │   │   └── FileTransfer.tsx      # 上传/下载（NEW）
│   │   │   ├── KeyManager/
│   │   │   │   ├── KeyList.tsx           # 密钥列表（NEW）
│   │   │   │   └── KeyForm.tsx           # 生成/导入（NEW）
│   │   │   └── ...
│   │   ├── stores/
│   │   │   ├── sessionStore.ts           # 终端会话管理（NEW）
│   │   │   ├── fileStore.ts              # SFTP 文件列表（NEW）
│   │   │   └── ...
│   │   ├── hooks/
│   │   │   ├── useSSHSession.ts          # SSH 连接钩子（NEW）
│   │   │   └── useTerminalIO.ts          # 终端 I/O 钩子（NEW）
│   │   └── types/
│   │       ├── session.ts                # 会话类型（NEW）
│   │       ├── sftp.ts                   # SFTP 文件类型（NEW）
│   │       └── key.ts                    # 密钥类型（NEW）
└── ...
```

---

## 任务分解

### Task 1: SSH 客户端核心 (TDD)
**Dependencies:** Phase 1 完成  
**Description:**
- 实现 `ssh.Client` 结构体，管理单个 SSH 连接
- 支持密码和密钥认证
- 连接池管理（同时多个连接）
- 实现 `Connect()`, `Authenticate()`, `Close()`
- 单元测试覆盖认证流程（mock 不需要真实 SSH 服务器）

**Output:**
- `internal/ssh/client.go`
- `internal/ssh/client_test.go`

**Acceptance Criteria:**
- ✅ 连接初始化不 panic
- ✅ 认证（密码/密钥）函数签名正确
- ✅ 连接关闭不泄漏资源
- ✅ 测试覆盖 >80%

---

### Task 2: PTY 终端桥接 (TDD)
**Dependencies:** Task 1  
**Description:**
- 创建伪终端（PTY），管理 stdin/stdout/stderr
- 连接 SSH 会话与 PTY
- 实现环保的行缓冲和非行缓冲模式切换
- 管理会话生命周期（创建、读写、清理）

**Output:**
- `internal/ssh/terminal.go`
- `internal/ssh/terminal_test.go`

**Acceptance Criteria:**
- ✅ PTY 创建成功
- ✅ 数据读写不阻塞
- ✅ 会话关闭清理资源

---

### Task 3: Wails Events for Terminal I/O
**Dependencies:** Task 2  
**Description:**
- 在 `app.go` 中实现 `OpenTerminal(hostID string)` → 返回 sessionID
- 后台 goroutine 读取 PTY stdout，通过 `wails.EventsEmit()` 推送到前端
- 实现 `SendTerminalInput(sessionID, input string)` 写入 stdin
- 实现 `CloseTerminal(sessionID)` 清理会话

**Output:**
- `app.go` 新增 3 个方法，修改 App 结构体

**Acceptance Criteria:**
- ✅ 终端打开不阻塞主线程
- ✅ 数据实时推送前端
- ✅ 会话隔离（一个 sessionID 对应一个独立会话）

---

### Task 4: 前端 Terminal 组件 (xterm.js)
**Dependencies:** Task 3  
**Description:**
- 安装 `xterm@^5` 和 `xterm-addon-fit`
- 创建 `TerminalPanel` 组件，初始化 xterm 实例
- 监听 Wails events，将数据写入终端
- 实现终端输入捕获，通过 Wails 发送回后端
- 支持终端清空、复制、主题跟随（亮/暗）

**Output:**
- `frontend/src/components/Terminal/TerminalPanel.tsx`
- `frontend/src/components/Terminal/TerminalTab.tsx`（单个标签）
- `frontend/src/hooks/useTerminalIO.ts`

**Acceptance Criteria:**
- ✅ 终端显示基本字符
- ✅ 输入被捕获并发送
- ✅ 主题切换生效

---

### Task 5: 多标签管理 (Zustand)
**Dependencies:** Task 4  
**Description:**
- 创建 `sessionStore` 管理活跃连接列表
- 支持打开、关闭、切换标签
- 记录每个标签的 hostID、sessionID、标题
- 清理已关闭标签对应的后端资源

**Output:**
- `frontend/src/stores/sessionStore.ts`
- `frontend/src/components/Terminal/TerminalTabBar.tsx`

**Acceptance Criteria:**
- ✅ 可打开多个标签
- ✅ 标签切换不丢失会话
- ✅ 关闭标签时清理资源

---

### Task 6: SFTP 客户端封装 (TDD)
**Dependencies:** Task 1  
**Description:**
- 实现 `sftp.Client` 包装 SSH 会话
- 实现 `ListDir(remotePath)`, `Download(remote, local)`, `Upload(local, remote)`, `Delete(path)`
- 进度回调（可选）
- 单元测试（mocking 文件系统）

**Output:**
- `internal/ssh/sftp.go`
- `internal/ssh/sftp_test.go`

**Acceptance Criteria:**
- ✅ 列目录返回正确结构
- ✅ 文件操作不 panic
- ✅ 路径处理正确（相对/绝对）

---

### Task 7: SFTP 后端 API
**Dependencies:** Task 6  
**Description:**
- 在 `app.go` 实现：
  - `ListRemoteDir(sessionID, path string)` → `[]*FileInfo`
  - `DownloadFile(sessionID, remote, local string)` → error
  - `UploadFile(sessionID, local, remote string)` → error
  - `DeleteRemoteFile(sessionID, path string)` → error
- 会话与 SFTP 客户端绑定

**Output:**
- `app.go` 新增 4 个方法

**Acceptance Criteria:**
- ✅ 目录列表返回正确格式
- ✅ 文件操作隔离（不同 sessionID）

---

### Task 8: 前端 SFTP 文件管理器
**Dependencies:** Task 7  
**Description:**
- 创建 `SFTPBrowser` 组件，双栏设计（本地/远程）
- 支持上下文菜单（删除、重命名、下载等）
- 拖拽上传文件
- 进度显示（可选）

**Output:**
- `frontend/src/components/FileManager/SFTPBrowser.tsx`
- `frontend/src/stores/fileStore.ts`

**Acceptance Criteria:**
- ✅ 列表显示远程文件
- ✅ 支持基本上传/下载
- ✅ 路径导航正确

---

### Task 9: 密钥管理后端 (TDD)
**Dependencies:** Task 1  
**Description:**
- 实现 `keymgr.GenerateKey(algorithm string)` → (public, private)
  - 支持 Ed25519 和 ECDSA P-256
- 实现 `keymgr.ImportKey(pemData []byte)` → 验证
- 在 store 中新增 `keys` 表，AES-GCM 加密私钥存储
- 实现 CRUD：`SaveKey()`, `ListKeys()`, `DeleteKey()`

**Output:**
- `internal/ssh/keymgr.go`
- `internal/ssh/keymgr_test.go`
- `internal/store/keys.go`

**Acceptance Criteria:**
- ✅ 密钥生成成功
- ✅ PEM 导入验证正确
- ✅ 存储的私钥被正确加密

---

### Task 10: 密钥管理后端 API
**Dependencies:** Task 9  
**Description:**
- 在 `app.go` 实现：
  - `GenerateSSHKey(algorithm, keyName string)` → (public, keyID, error)
  - `ImportSSHKey(pemData []byte, keyName string)` → (keyID, error)
  - `ListSSHKeys()` → `[]*KeyInfo`
  - `DeleteSSHKey(keyID string)` → error
  - `GetPublicKey(keyID string)` → string

**Output:**
- `app.go` 新增 5 个方法

**Acceptance Criteria:**
- ✅ 密钥可生成和导入
- ✅ 列表显示所有密钥
- ✅ 删除清理正确

---

### Task 11: 前端密钥管理 UI
**Dependencies:** Task 10  
**Description:**
- 创建 `KeyManager` 组件，列表显示已存储密钥
- 支持生成新密钥（选择算法）、导入 PEM、删除、复制公钥
- 仅显示公钥指纹，不显示私钥

**Output:**
- `frontend/src/components/KeyManager/KeyList.tsx`
- `frontend/src/components/KeyManager/KeyForm.tsx`
- `frontend/src/stores/keyStore.ts`

**Acceptance Criteria:**
- ✅ 可生成密钥
- ✅ 可导入 PEM
- ✅ 公钥指纹显示正确

---

### Task 12: 集成认证流程
**Dependencies:** Task 5, Task 10  
**Description:**
- 修改 `HostForm` 添加认证方式选择（密码/密钥）
- 密钥认证时，从密钥列表中选择
- 连接时使用正确的认证方式
- 错误处理和重试逻辑

**Output:**
- 修改 `frontend/src/components/Host/HostForm.tsx`
- 修改 `frontend/src/stores/hostStore.ts`
- 修改 `app.go` 的连接方法

**Acceptance Criteria:**
- ✅ 密码认证流程完整
- ✅ 密钥认证流程完整
- ✅ 认证失败有错误提示

---

### Task 13: 会话历史与命令日志（可选）
**Dependencies:** Task 3  
**Description:**
- 在 store 中新增 `sessions` 表
- 记录每次连接：主机、用户、连接时间、命令历史
- 前端显示连接历史和常用命令

**Output:**
- `internal/store/sessions.go`
- 修改 `app.go` 的连接方法

**Acceptance Criteria:**
- ✅ 连接历史持久化
- ✅ 查询历史快速

---

### Task 14: 最终集成测试与性能验证
**Dependencies:** Task 5, 8, 11, 12  
**Description:**
- 集成测试（多标签、切换、I/O）
- 连接稳定性测试（保持连接时间）
- 内存占用检查（vs Electron baseline）
- 再次构建，验证 < 50MB

**Output:**
- `internal/integration_test.go`
- 性能报告

**Acceptance Criteria:**
- ✅ 无竞态条件或 goroutine 泄漏
- ✅ 内存占用稳定
- ✅ 可执行文件 < 50MB

---

## 推荐顺序

**Week 1:**
- [ ] Task 1: SSH 客户端核心
- [ ] Task 2: PTY 终端桥接
- [ ] Task 3: Wails Events

**Week 2:**
- [ ] Task 4: 前端 Terminal 组件
- [ ] Task 5: 多标签管理

**Week 3:**
- [ ] Task 6: SFTP 客户端
- [ ] Task 7: SFTP 后端 API
- [ ] Task 8: 前端 SFTP UI

**Week 4:**
- [ ] Task 9: 密钥管理后端
- [ ] Task 10: 密钥管理 API
- [ ] Task 11: 前端密钥 UI
- [ ] Task 12: 认证集成

**Week 5:**
- [ ] Task 13: 会话历史（可选）
- [ ] Task 14: 集成测试与构建

---

## 风险与备选方案

| 风险 | 备选 |
|------|------|
| xterm.js 性能不佳 | 考虑 react-xterm（社区封装）或 VT100 简化版 |
| SFTP 大文件传输 | 实现分块上传，进度反馈 |
| 认证超时 | 实现认证重试和超时配置 |
| 内存泄漏（goroutine） | 严格的会话清理，定期 pprof 检查 |

---

## 验收标准

**Phase 2 完成时：**
- ✅ SSH 连接建立、认证、会话管理
- ✅ 多标签终端，完整 I/O
- ✅ SFTP 文件管理（列表、上传、下载、删除）
- ✅ 密钥生成和导入
- ✅ Go 后端 >85% 测试覆盖
- ✅ 可执行文件 < 50MB
- ✅ 无已知泄漏或竞态

---

## 下一步（Phase 3 预期）

- 端口转发（本地 `-L` 和远程 `-R`）
- SFTP 文件同步
- 会话录制与回放
- 跳板机/代理支持
- macOS 构建和签名
