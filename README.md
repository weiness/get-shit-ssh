# GSS — Get Shit SSH

一款基于 Go + React + Wails 构建的轻量级桌面 SSH 客户端和 SFTP 文件管理器。

![平台](https://img.shields.io/badge/平台-Windows%20%7C%20macOS-blue)
![许可证](https://img.shields.io/badge/许可证-MIT-green)
![Go](https://img.shields.io/badge/Go-1.21+-00ADD8)
![React](https://img.shields.io/badge/React-18-61DAFB)

## 功能特性

- **多标签终端** — 并排开启多个 SSH 会话，`Ctrl+Tab` 切换
- **SSH 认证** — 支持密码和 SSH 密钥（Ed25519 / ECDSA / RSA）
- **SSH 密钥管理器** — 在应用内生成、导入和管理密钥
- **SFTP 文件浏览器** — 浏览、上传、下载、重命名、删除远程文件
- **连接测试** — 保存主机前先验证凭据
- **会话历史** — 记录历史连接
- **深色 / 浅色主题**
- **键盘快捷键** — `Ctrl+T`、`Ctrl+W`、`Ctrl+Tab` 等

## 截图

> 即将上线

## 安装

### 下载

在 [Releases](https://github.com/weiness/get-shit-ssh/releases) 页面下载预构建二进制文件。

| 平台 | 架构 | 文件 |
|------|------|------|
| Windows | x64 (Intel/AMD) | `gss-windows-amd64.exe` |
| Windows | ARM64 | `gss-windows-arm64.exe` |
| macOS | Intel | `gss-macos-intel.app.zip` |
| macOS | Apple Silicon (M1/M2/M3) | `gss-macos-apple-silicon.app.zip` |

### 从源码构建

**前置依赖**

- [Go 1.21+](https://go.dev/dl/)
- [Node.js 18+](https://nodejs.org/)
- [Wails v2](https://wails.io/docs/gettingstarted/installation)

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

**构建**

```bash
git clone https://github.com/weiness/get-shit-ssh.git
cd get-shit-ssh

# 安装前端依赖
cd frontend && npm install && cd ..

# 开发模式（热重载）
wails dev

# 生产构建
wails build
```

输出二进制在 `build/bin/` 目录。

## 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+T` | 新建连接标签页 |
| `Ctrl+W` | 关闭当前标签页 |
| `Ctrl+Tab` | 下一个标签页 |
| `Ctrl+Shift+Tab` | 上一个标签页 |
| `` Ctrl+` `` | 展开/收起主机面板 |

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面壳 | [Wails v2](https://wails.io) |
| 后端 | Go、`golang.org/x/crypto/ssh` |
| 前端 | React 18、TypeScript、Tailwind CSS |
| 终端 | [xterm.js](https://xtermjs.org/) |
| 状态管理 | Zustand |
| 存储 | SQLite（via `modernc.org/sqlite`） |

## 项目结构

```
get-shit-ssh/
├── app.go              # Wails IPC 绑定
├── main.go
├── internal/
│   ├── ssh/            # SSH 客户端、PTY 终端、SFTP
│   ├── store/          # SQLite：主机、密钥、会话
│   └── crypto/         # 凭据加密
└── frontend/
    └── src/
        ├── components/ # UI 组件
        ├── stores/     # Zustand 状态
        └── hooks/      # useTerminalIO 等
```

## 安全说明

- 凭据使用 AES-GCM 加密后存入 SQLite
- 主机密钥验证目前设置为 `InsecureIgnoreHostKey`，严格验证功能规划中

## 贡献

欢迎提交 Pull Request。重大变更请先开 Issue 讨论。

```bash
git checkout -b feature/your-feature
git commit -m "feat: 描述你的改动"
git push origin feature/your-feature
```

## 许可证

[MIT](LICENSE)
