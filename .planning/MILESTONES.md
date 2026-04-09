# Milestones

## v1.0 MVP — 2026-04-09

**Status:** ✅ SHIPPED
**Phases:** 3 | **Git tag:** v1.0.0
**Code:** ~5,900 行（Go + TypeScript）
**Timeline:** 2026-04-03 → 2026-04-09

### What Shipped

- 多标签 SSH 终端，支持并行连接多台主机
- SSH 密码 + 密钥认证（Ed25519 / ECDSA / RSA）
- 应用内 SSH 密钥生成与导入管理器
- SFTP 文件浏览器（上传、下载、重命名、删除、创建目录）
- 连接前测试验证（Test Connection）
- 会话历史记录
- 深色 / 浅色主题 + 键盘快捷键
- 凭据 AES-GCM 加密存储至 SQLite
- GitHub Actions 自动构建发布（Windows + macOS）

### Key Decisions

- 使用 Wails v2 而非 Electron——体积小、无额外运行时
- SQLite modernc（纯 Go）——无 CGO，跨平台编译无痛
- 手动 CHANGELOG + awk 提取——Release notes 可读性更好
- 移除 Linux 构建——减少 CI 复杂度

### Known Tech Debt

- `app.go` 加密密钥硬编码为 32 字节零值（TODO: 加载自安全密钥库）
- 主机密钥验证为 `InsecureIgnoreHostKey`（计划 v1.1 修复）

---

*详细归档: .planning/milestones/v1.0-ROADMAP.md*
