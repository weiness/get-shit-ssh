# Roadmap: GSS — Get Shit SSH

## Milestones

- ✅ **v1.0.0 MVP** — Phases 1-3 (shipped 2026-04-09) → [Archive](milestones/v1.0-ROADMAP.md)
- 🚧 **v1.0.1 细节打磨** — Phases 4-5 (in progress)

## Phases

<details>
<summary>✅ v1.0.0 MVP (Phases 1-3) — SHIPPED 2026-04-09</summary>
- [x] Phase 1: 核心基础 (完成)
- [x] Phase 2: 功能完善 (完成)
- [x] Phase 3: 发布准备 (完成)

</details>

### 🚧 v1.0.1 细节打磨

- [ ] Phase 4: 终端体验优化
- [ ] Phase 5: 主机管理与交互反馈

---

## Phase 4: 终端体验优化

**Goal:** 提升终端交互体验，修复主题视觉一致性问题

**Requirements:** TERM-01, TERM-02, TERM-03, TERM-04, UX-03

**Depends on:** Phase 3 (已完成)

**Plans:** 2 plans

Plans:
- [ ] 04-01-PLAN.md — 终端主题联动（亮色/暗色主题动态切换 + Tab/QuickConnect 背景色同步）
- [ ] 04-02-PLAN.md — 右键菜单 + Tab Tooltip（复制/粘贴/清空 + 完整主机信息悬停提示）

**Success criteria:**
1. 终端区域右键弹出菜单，复制/粘贴/清空均可正常工作
2. 无选中文本时「复制」项视觉置灰
3. 切换到亮色主题后，终端背景变为护眼色，文字清晰可读
4. 激活 tab 背景色与终端背景色一致（亮色/暗色均正确）
5. Tab 悬停显示完整主机信息 tooltip

---

## Phase 5: 主机管理与交互反馈

**Goal:** 防止误删主机，改善连接失败的反馈体验，主机列表支持分组折叠

**Requirements:** HOST-01, HOST-02, HOST-03, UX-01, UX-02

**Depends on:** Phase 4

**Success criteria:**
1. 点击删除主机后出现确认对话框，取消不执行删除
2. 主机列表按分组名称分区展示，每组可折叠
3. 无分组主机正确处理（不崩溃，有合理展示）
4. 连接/重连失败时显示 Toast，不再弹 alert()
5. Toast 自动消失，不阻塞操作

---

## Progress

| Phase | Milestone | 状态 | 完成日期 |
|-------|-----------|------|----------|
| 1. 核心基础 | v1.0.0 | Complete | 2026-04-03 |
| 2. 功能完善 | v1.0.0 | Complete | 2026-04-08 |
| 3. 发布准备 | v1.0.0 | Complete | 2026-04-09 |
| 4. 终端体验优化 | v1.0.1 | Not started | — |
| 5. 主机管理与交互反馈 | v1.0.1 | Not started | — |
