# State: GSS

**Status**: active
**Last activity**: 2026-04-09 — Milestone v1.1 started

## Current Position

Phase: 4 — 终端体验优化
Plan: —
Status: Not started
Last activity: 2026-04-09 — Milestone v1.1 started

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-09)

**Core value:** 比 PuTTY / SecureCRT 更现代、更轻量的桌面 SSH 客户端，开箱即用
**Current focus:** v1.1 细节打磨 — Phase 4 终端体验优化

## Current Milestone

v1.1 细节打磨 — Phases 4-5

## Open Blockers

无

## Accumulated Context

- v1.0.0 已发布，tag 推送至 GitHub，CI 自动构建 4 个产物（Win amd64/arm64, macOS Intel/Apple Silicon）
- 已知技术债：加密密钥硬编码为零值，待后续修复
- 终端主题颜色在 TerminalPane.tsx 中硬编码，需与 themeStore 联动
- SFTPBrowser 已有 contextMenu 实现可参考，终端右键菜单可参照该模式
