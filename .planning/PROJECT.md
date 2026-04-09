# Project: GSS — Get Shit SSH

## What This Is

一款基于 Go + React + Wails 构建的轻量级桌面 SSH 客户端，支持多标签终端、SFTP 文件管理和 SSH 密钥管理，面向 Windows 和 macOS 平台。

## Core Value

一个比 PuTTY / SecureCRT 更现代、更轻量的桌面 SSH 客户端——无需额外配置，开箱即用。

## Tech Stack

- **桌面壳**: Wails v2（Go + WebView）
- **后端**: Go 1.21+、`golang.org/x/crypto/ssh`
- **前端**: React 18、TypeScript、Tailwind CSS、xterm.js、Zustand
- **存储**: SQLite（`modernc.org/sqlite`，纯 Go，无 CGO 依赖）
- **加密**: AES-GCM（`gss/internal/crypto`）

## Requirements

### Validated

- ✓ 多标签 SSH 终端，支持并行连接多台主机 — v1.0
- ✓ SSH 密码认证 — v1.0
- ✓ SSH 密钥认证（Ed25519 / ECDSA / RSA） — v1.0
- ✓ 应用内 SSH 密钥生成与导入 — v1.0
- ✓ SFTP 文件浏览、上传、下载、重命名、删除、创建目录 — v1.0
- ✓ 连接前测试验证（Test Connection） — v1.0
- ✓ 会话历史记录 — v1.0
- ✓ 深色 / 浅色主题切换 — v1.0
- ✓ 键盘快捷键（Ctrl+T / W / Tab） — v1.0
- ✓ 标签页连接状态指示器（绿/红） — v1.0
- ✓ 断开重连按钮 — v1.0
- ✓ 凭据 AES-GCM 加密存储 — v1.0
- ✓ GitHub Actions 自动构建发布 Windows + macOS — v1.0

### Active

- [ ] 终端右键菜单（复制/粘贴/清空）
- [ ] 亮色主题护眼终端配色
- [ ] 删除主机二次确认弹窗
- [ ] 连接失败改用 Toast
- [ ] Tab 悬停 tooltip 显示完整主机信息
- [ ] 主机列表按分组折叠/展开
- [ ] 修复激活 tab 背景色与终端主题联动
- [ ] 严格主机密钥验证（Host Key Verification）——目前为 `InsecureIgnoreHostKey`（延期）

### Out of Scope

- Linux 桌面包——用户群体以 Windows / macOS 为主，Linux 用户通常用原生终端
- 移动端——桌面优先
- 内置 Tmux / 会话保持——依赖服务端 tmux
- 视频 / 音频——专用工具更合适

## Key Decisions

| 决策 | 结果 | 原因 |
|------|------|------|
| 使用 Wails v2 而非 Electron | ✓ 正确 | 体积小、无 Node 运行时依赖、原生 Go 后端 |
| SQLite（modernc，纯 Go） | ✓ 正确 | 无 CGO，跨平台编译简单，无外部依赖 |
| 凭据 AES-GCM 加密 | ✓ 正确 | 保证本地存储安全；密钥暂时硬编码为 TODO |
| 移除 Linux 构建 | ✓ 正确 | 减少 CI 复杂度，用户基础主要在 Win/Mac |
| xterm.js 终端 | ✓ 正确 | 成熟稳定，原生支持 ANSI 转义序列 |
| 手动 CHANGELOG（非自动生成） | ✓ 正确 | 自动生成 release notes 不够易读，手写更有价值 |

## Current Milestone: v1.0.1 细节打磨

**Goal:** 修复交互细节、提升终端体验、统一视觉一致性，不添加新功能

**Target features:**
- 终端右键菜单（复制/粘贴/清空）
- 亮色主题护眼终端配色（暗色保持不变）
- 删除主机二次确认弹窗
- 连接失败改用 Toast（替换 alert()）
- Tab 悬停 tooltip 显示完整主机信息
- 主机列表按分组折叠/展开
- 修复激活 tab 背景色与终端主题联动

## Context

- **当前版本**: v1.0.0（2026-04-09 发布）
- **代码量**: ~5,900 行（Go + TypeScript）
- **构建产物**: 4 个——Windows amd64/arm64，macOS Intel/Apple Silicon
- **已知技术债**: `app.go` 中加密密钥硬编码为 32 字节零值，未从安全密钥库加载
- **下一个里程碑候选**: 严格主机密钥验证、连接分组

---
*Last updated: 2026-04-09 after v1.0.0 milestone, v1.0.1 started*
