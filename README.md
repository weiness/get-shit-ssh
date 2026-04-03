# get-shit-ssh (GSS)

SSH 客户端 + SFTP 文件管理工具（Wails + Go + React 桌面应用）

![Phase 2 Progress](https://img.shields.io/badge/Phase%202-3%2F14%20Tasks-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## 功能概览

- ✅ **SSH 连接管理**: 密码 + 密钥认证，会话管理
- ✅ **PTY 终端**: 交互式 Shell，xterm.js 渲染
- 🔄 **SFTP 文件传输**: 文件列表、上传、下载、删除（开发中）
- 🔄 **密钥管理**: Ed25519/ECDSA 生成与导入（开发中）
- 🔄 **会话历史**: 命令日志与会话恢复（计划中）

## 快速开始

### 前置条件

- Go 1.20+
- Node.js 16+
- Wails v2 (`go install github.com/wailsapp/wails/v2/cmd/wails@latest`)

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/weiness/get-shit-ssh.git
cd get-shit-ssh

# 安装依赖
go mod download
cd frontend && npm install && cd ..

# 开发模式（热重载）
wails dev

# 或使用 go run
go run github.com/wailsapp/wails/v2/cmd/wails@latest dev
```

### 编译生产版本

```bash
wails build -o gss.exe
```

## 项目结构

```
gss/
├── app.go                    # Wails IPC 接口
├── main.go                   # 应用入口
├── go.mod, go.sum
├── wails.json
│
├── internal/
│   ├── ssh/
│   │   ├── client.go        # SSH Manager (Task 1 ✅)
│   │   ├── terminal.go      # PTY Session (Task 2 ✅)
│   │   └── sftp.go          # SFTP (Task 4 🔄)
│   └── store/
│       ├── hosts.go         # Host CRUD
│       └── db.go            # SQLite
│
├── frontend/
│   ├── src/
│   │   ├── stores/
│   │   │   └── sessionStore.ts (Task 3 ✅)
│   │   ├── hooks/
│   │   │   └── useTerminalIO.ts (Task 3 ✅)
│   │   └── components/
│   │       ├── Terminal/TerminalPane.tsx (Task 3 ✅)
│   │       └── Host/
│   └── package.json
│
└── docs/
    └── PROJECT_SUMMARY.md   # 详细实现文档
```

## 开发工作流

### Phase 2 进度

| Task | 功能 | 状态 | 文件 |
|------|------|------|------|
| 1 | SSH 客户端核心 | ✅ | internal/ssh/client.go |
| 2 | PTY 终端桥接 | ✅ | internal/ssh/terminal.go |
| 3 | Wails Events 集成 | ✅ | app.go, sessionStore.ts |
| 4 | SFTP 文件管理 | 🔄 | internal/ssh/sftp.go |
| 5-7 | SFTP UI 组件 | ⏳ | frontend/src/components/FileManager/ |
| 8-10 | 密钥管理 | ⏳ | internal/store/keys.go |
| 11-14 | 高级功能 | ⏳ | 会话日志、端口转发等 |

### 下一个任务 (Task 4)

参考 `docs/PROJECT_SUMMARY.md` 中的详细设计与实现指南。

## 架构

### 后端 (Go + Wails)

```
Wails App
├── SSH Manager
│   ├── Session (SSH Client)
│   └── TerminalSession (PTY)
├── SFTP Manager (TODO)
├── Key Manager (TODO)
└── Database (SQLite)
```

### 前端 (React + TypeScript)

```
React App
├── Host Management (Phase 1)
├── Terminal UI (Task 3)
│   ├── sessionStore (Zustand)
│   └── useTerminalIO (Hook)
└── File Manager (Task 5, TODO)
```

### 数据流

```
用户操作 → HostList
  → SSHConnect(hostID) 
  → OpenTerminal(sessionID)
  → pumpTerminalOutput (goroutine)
  → runtime.EventsEmit(terminal:data:<termID>, data)
  → EventsOn 订阅
  → TerminalPane 渲染
```

## 关键实现细节

### Task 1: SSH Manager
- 使用 `golang.org/x/crypto/ssh` 进行 SSH 通信
- 支持密码和密钥认证
- 会话池管理（map + RWMutex）
- 完整的单元测试覆盖

### Task 2: PTY Terminal
- 使用 golang.org/x/crypto/ssh 原生 PTY 支持（无需外部 pty 库）
- 后台 goroutine 持续读取 stdout
- 使用 `sync.Once` 确保幂等关闭
- 通过 buffered channel 推送数据

### Task 3: Wails IPC Integration
- 6 个公开 IPC 方法（SSHConnect, OpenTerminal 等）
- 后台 goroutine (pumpTerminalOutput) 通过 EventsEmit 实时推送数据
- 前端 Zustand store + useTerminalIO hook 订阅事件
- xterm.js 终端 UI with FitAddon 自动 resize

## 测试

### 运行单元测试

```bash
go test ./internal/ssh -v
go test ./internal/store -v
```

### 前端测试

```bash
cd frontend && npm run test
```

### 手动测试流程

1. **启动应用**: `wails dev`
2. **添加主机**: 点击"添加主机"
3. **连接**: 点击主机旁的 Terminal 图标
4. **交互**: 在终端中输入命令
5. **验证**: 观察输出、输入回显、窗口 resize

## 已知问题

- [ ] Host key 验证（当前: InsecureIgnoreHostKey）
- [ ] 加密密钥管理（当前: placeholder）
- [ ] 多标签终端
- [ ] SFTP 断点续传

## 贡献指南

1. Fork 仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

## 许可证

MIT License

## 联系方式

- GitHub: https://github.com/weiness/get-shit-ssh
- Issues: 报告 bug 或功能请求

---

**项目状态**: Phase 2 进行中 (3/14 完成)  
**最后更新**: 2026-04-03  
**下次里程碑**: Task 4 完成 (SFTP 文件管理)
