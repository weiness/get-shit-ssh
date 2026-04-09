# Requirements: GSS v1.0

> ⚠️ 已归档 — 此文件为 v1.0 里程碑归档版本。当前需求见 PROJECT.md。

## 功能需求

| ID | 需求 | 状态 | 阶段 |
|----|------|------|------|
| REQ-01 | 多标签 SSH 终端，支持并行连接 | ✅ Complete | Phase 1 |
| REQ-02 | SSH 密码认证 | ✅ Complete | Phase 1 |
| REQ-03 | SSH 密钥认证（Ed25519 / ECDSA / RSA） | ✅ Complete | Phase 1 |
| REQ-04 | 应用内 SSH 密钥生成与导入 | ✅ Complete | Phase 1 |
| REQ-05 | SFTP 文件浏览、上传、下载、重命名、删除 | ✅ Complete | Phase 2 |
| REQ-06 | 连接前测试验证 | ✅ Complete | Phase 2 |
| REQ-07 | 会话历史记录 | ✅ Complete | Phase 2 |
| REQ-08 | 深色 / 浅色主题 | ✅ Complete | Phase 2 |
| REQ-09 | 键盘快捷键 | ✅ Complete | Phase 2 |
| REQ-10 | 凭据 AES-GCM 加密存储 | ✅ Complete | Phase 1 |
| REQ-11 | GitHub Actions 自动构建发布 | ✅ Complete | Phase 3 |
| REQ-12 | 标签页连接状态指示器 | ✅ Complete | Phase 2 |
| REQ-13 | 断开重连按钮 | ✅ Complete | Phase 2 |

## 需求变更记录

- REQ-11 CI 构建：初期包含 Linux，后移除（用户群体以 Win/Mac 为主）
- REQ-11 CI Changelog：最终采用手动 CHANGELOG + awk 提取方案

## 延期需求（转入 v1.1）

- 严格主机密钥验证（当前 `InsecureIgnoreHostKey`）
- 连接分组 / 文件夹
