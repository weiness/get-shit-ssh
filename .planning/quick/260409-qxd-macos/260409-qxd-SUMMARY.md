---
quick_id: 260409-qxd
status: completed
date: 2026-04-09
commits:
  - 645c45b
  - 397e764
---

# Quick Task 260409-qxd: 终端快捷键与字体设置

## What was done

- `TerminalPane.tsx`: 添加 `fontSize` prop + `useEffect` 动态更新 xterm 字体大小；添加 `isMac` 平台检测；在 `attachCustomKeyEventHandler` 中拦截复制粘贴快捷键（macOS: Cmd+C/V，Win/Linux: Ctrl+Shift+C/V），使用 ref 避免 stale closure；右键菜单复制/粘贴按钮添加快捷键提示标签
- `HostList.tsx`: 添加 `fontSize` state（默认 13，范围 8-24）；添加 `isMac` 常量；在 `shortcutHandler` 中添加字体缩放快捷键（macOS: Cmd+=/−，Win/Linux: Ctrl+=/−）；添加 Settings 齿轮按钮（Tab bar 最右侧）；添加设置 popover（+/- 按钮 + range slider + 快捷键提示）；传递 `fontSize` prop 给 TerminalPane

## Result

- 复制粘贴快捷键：macOS Cmd+C/V，Windows/Linux Ctrl+Shift+C/V，右键菜单显示对应提示
- 字体缩放：macOS Cmd+=/−，Windows/Linux Ctrl+=/−，范围 8-24px
- 设置按钮：Tab bar 右侧齿轮图标，点击弹出 popover 可调整字体大小
- macOS 快捷键全面支持（Cmd 键替代 Ctrl）
