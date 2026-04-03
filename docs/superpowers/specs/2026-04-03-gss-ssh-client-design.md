# GSS — SSH 客户端设计文档

**日期：** 2026-04-03  
**状态：** 已确认  
**技术栈：** Go + Wails v2 + React 18 + TypeScript

---

## 一、项目概述

GSS 是一款面向 Windows 和 macOS 的桌面 GUI SSH 客户端，设计目标是在保持完整功能的前提下实现最小打包体积和最低内存占用。安装包目标 < 50MB，运行时内存显著低于 Electron 系产品。

---

## 二、技术选型

| 层次 | 技术 | 选型理由 |
|------|------|---------|
| 后端语言 | Go | SSH 生态最成熟，`golang.org/x/crypto/ssh` 久经考验 |
| 桌面框架 | Wails v2 | 复用系统 WebView，无需捆绑 Chromium，体积极小 |
| 前端框架 | React 18 + TypeScript | 生态成熟，组件化开发效率高 |
| 终端模拟 | xterm.js v5 | 业界标准终端模拟器，功能完善 |
| 状态管理 | Zustand | 轻量，无 Redux 样板代码 |
| 样式 | Tailwind CSS v4 | 生产构建按需裁剪，< 15KB |
| 图标 | lucide-react | 按需导入 SVG，体积可控 |
| 数据库 | modernc.org/sqlite | 纯 Go 实现，无 CGO 依赖，打包友好 |

---

## 三、整体架构

```
gss/
├── main.go                  # Wails 入口
├── app.go                   # App 结构体，注册到 Wails 上下文
├── internal/
│   ├── ssh/
│   │   ├── client.go        # SSH 连接管理，会话生命周期
│   │   ├── terminal.go      # PTY 会话，stdin/stdout 桥接
│   │   ├── sftp.go          # SFTP 操作封装
│   │   ├── tunnel.go        # 端口转发
│   │   └── keymgr.go        # 密钥生成、导入、存储
│   ├── store/
│   │   ├── hosts.go         # 主机配置 CRUD
│   │   └── db.go            # 数据库初始化
│   └── crypto/
│       └── vault.go         # 密码/密钥加密存储（AES-GCM）
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Terminal/    # xterm.js 封装
│   │   │   ├── FileManager/ # SFTP 文件管理器
│   │   │   ├── HostList/    # 左侧主机列表
│   │   │   ├── KeyManager/  # 密钥管理界面
│   │   │   └── Menu/        # 右上角菜单组件
│   │   ├── stores/          # Zustand 状态管理
│   │   └── App.tsx
│   └── package.json
├── wails.json
└── build/                   # 平台打包产物
```

**数据流：**
- 前端通过 Wails 绑定直接调用 Go 函数（无 HTTP，IPC 零开销）
- Go 后端管理所有 SSH 连接状态，前端只负责渲染
- 终端 I/O 通过 Wails Events 实时推送，不阻塞 UI

---

## 四、核心功能范围

- SSH 终端连接（基础 shell 会话，多标签）
- 连接管理（保存主机、分组、快速连接）
- SFTP 文件传输（双栏管理器，拖拽上传，进度显示）
- 端口转发（本地转发 `-L`，远程转发 `-R`）
- 密钥管理（生成 Ed25519/ECDSA P-256，导入 PEM）
- 亮色/暗色主题切换

---

## 五、数据存储

### 主机配置表 `hosts`

```sql
CREATE TABLE hosts (
    id          TEXT PRIMARY KEY,  -- UUID
    name        TEXT NOT NULL,     -- 显示名称
    group_name  TEXT,              -- 分组
    host        TEXT NOT NULL,     -- IP/域名
    port        INTEGER DEFAULT 22,
    username    TEXT NOT NULL,
    auth_type   TEXT NOT NULL,     -- "password" | "key"
    secret      BLOB,              -- AES-GCM 加密的密码或私钥路径
    key_id      TEXT,              -- 关联 keys 表
    created_at  INTEGER,
    updated_at  INTEGER
);
```

### 密钥表 `keys`

```sql
CREATE TABLE keys (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    public_key  TEXT NOT NULL,
    private_key BLOB NOT NULL,     -- AES-GCM 加密存储
    created_at  INTEGER
);
```

### 加密方案

- 主密钥优先从系统 Keychain 读取（Windows: DPAPI，macOS: Keychain）
- 回退方案：PBKDF2 派生密钥（机器唯一标识作为 salt）
- 敏感字段单独 AES-GCM 加密，数据库文件本身不加密

### 配置文件路径

```
Windows: %APPDATA%\gss\
macOS:   ~/Library/Application Support/gss/
```

---

## 六、SSH 核心模块

### 连接池

```go
type SessionManager struct {
    sessions map[string]*Session
    mu       sync.RWMutex
}

type Session struct {
    ID       string
    Client   *ssh.Client
    Terminal *TerminalSession
    Sftp     *sftp.Client
    Tunnels  []*Tunnel
}
```

同一 SSH 连接上可并开多个 Channel（终端标签、SFTP、隧道共享底层 TCP）。

### 终端 I/O 桥接

```
xterm.js → Wails IPC → Go Channel → SSH PTY stdin
SSH PTY stdout → goroutine → Wails Event → xterm.js
```

- Go 批量读取 PTY stdout 后推送（降低 IPC 频率）
- 窗口 resize 同步调用 `session.WindowChange(rows, cols)`

### 端口转发

| 类型 | 说明 |
|------|------|
| 本地转发 `-L` | 监听本地端口，流量转发到远端目标 |
| 远程转发 `-R` | 远端监听，流量转发回本地 |

每条隧道独立 goroutine，错误自动上报前端。

### 密钥管理

- 生成算法：Ed25519（默认）、ECDSA P-256
- 导入：解析 PEM，加密后存入 `keys` 表
- 使用：连接时从 vault 解密，内存用完清零

---

## 七、UI 设计

### 整体布局

```
┌─────────────────────────────────────────────────────┐
│  [+] 新连接  [🔍 搜索]                          [☰] │
├──────────────┬──────────────────────────────────────┤
│              │  [Tab1: server1] [Tab2: server2] [+] │
│  ▼ 生产环境  │──────────────────────────────────────│
│    server1   │                                      │
│    server2   │         Terminal / SFTP / 空白        │
│  ▶ 测试环境  │                                      │
│    server3   │                                      │
│              │                                      │
│  [密钥管理]  │                                      │
└──────────────┴──────────────────────────────────────┘
```

### 右上角菜单（☰）

点击图标展开下拉菜单：

| 菜单项 | 行为 |
|--------|------|
| 主题 ▶ | hover 展开子菜单 |
| → 暗色 | 切换暗色主题，当前项显示 ✓ |
| → 亮色 | 切换亮色主题，当前项显示 ✓ |
| 帮助 | 打开 GitHub README |
| 关于 | 弹窗显示版本号、开源协议 |

- 菜单组件自行实现，不引入第三方 UI 库
- 点击菜单外区域自动关闭
- 主题状态存 `localStorage`，启动时自动恢复

### 主题色板

| Token | 亮色 | 暗色 |
|-------|------|------|
| 背景 | `#F5F5F5` | `#1E1E2E` |
| 侧栏 | `#EBEBEB` | `#181825` |
| 终端背景 | `#FFFFFF` | `#11111B` |
| 强调色 | `#0066CC` | `#89B4FA` |

### 终端组件

- xterm.js v5 + `@xterm/addon-fit`（自适应容器）
- `@xterm/addon-web-links`（URL 可点击）
- 字体：JetBrains Mono（子集化，仅 ASCII，约 200KB）

### SFTP 文件管理器

- 左右双栏：本地 ↔ 远端
- 拖拽上传，进度条实时显示
- 面包屑导航，支持隐藏文件切换

---

## 八、打包与体积控制

### 预估体积

| 平台 | 安装包 | 内存（空载） |
|------|--------|------------|
| Windows | ~18-25MB | ~55-80MB |
| macOS | ~15-20MB | ~50-70MB |

### 优化措施

```bash
# Go 编译去除调试信息
go build -ldflags="-s -w"

# 前端生产构建
vite build  # Tree-shaking + Tailwind 按需裁剪

# Wails 打包
wails build -platform windows/amd64 -clean
wails build -platform darwin/amd64,darwin/arm64
```

- xterm.js 只导入用到的 addon
- lucide-react 按需导入（不打包整个图标库）
- JetBrains Mono 字体子集化（ASCII only）

---

## 九、超出范围（暂不实现）

- 自定义主题
- 自动更新
- 远程转发以外的 SOCKS5 代理
- 会话录制/回放
- 协同/团队共享配置
