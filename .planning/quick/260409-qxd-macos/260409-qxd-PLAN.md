# Quick Task: 终端快捷键与字体设置

**ID:** 260409-qxd
**Date:** 2026-04-09
**Description:** 复制粘贴快捷键、字体大小缩放、设置菜单、macOS支持

## 需求分析

用户需求：
1. 复制粘贴快捷键 + 右键菜单显示快捷键提示
2. macOS 快捷键支持（Cmd 键）
3. 字体大小缩放快捷键（Ctrl+= / Ctrl+-）
4. 设置按钮/菜单用于调整字体

技术决策：
- **快捷键冲突解决**：macOS 用 Cmd+C/V（无冲突），Windows/Linux 用 Ctrl+Shift+C/V（遵循 Linux 终端惯例）
- **平台检测**：`navigator.platform.includes('Mac')`
- **字体状态**：放在 HostList 父组件，通过 prop 传入 TerminalPane
- **设置按钮位置**：Tab bar 最右侧，紧接 Plus 按钮

## 任务列表

### Task 1: TerminalPane 快捷键与菜单提示

**文件：** `frontend/src/components/Terminal/TerminalPane.tsx`

**变更：**
1. 添加 `fontSize?: number` prop
2. 添加 `isMac` 常量检测平台
3. 在 `attachCustomKeyEventHandler` 中拦截复制粘贴快捷键：
   - macOS: Cmd+C / Cmd+V
   - Windows/Linux: Ctrl+Shift+C / Ctrl+Shift+V
4. 添加 `useEffect([fontSize])` 动态更新 xterm 字体大小
5. 右键菜单添加快捷键提示标签

### Task 2: HostList 字体状态与设置按钮

**文件：** `frontend/src/components/Host/HostList.tsx`

**变更：**
1. 添加 `fontSize` state（默认 13）
2. 添加 `isMac` 常量
3. 在 `shortcutHandler` 中添加字体缩放快捷键：
   - macOS: Cmd+= / Cmd+-
   - Windows/Linux: Ctrl+= / Ctrl+-
   - 范围：8-24px
4. 添加 Settings 齿轮按钮（Tab bar 最右侧）
5. 添加设置 popover：
   - +/- 按钮
   - Range slider
   - 快捷键提示
6. 传递 `fontSize` prop 给 TerminalPane

## 实现波次

**Wave 1:** Task 1 + Task 2（顺序执行，共享 fontSize 接口）
