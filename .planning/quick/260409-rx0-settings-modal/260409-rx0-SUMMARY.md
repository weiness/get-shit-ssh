---
quick_id: 260409-rx0
status: completed
date: 2026-04-09
---

# Quick Task 260409-rx0: 设置弹窗重构

## What was done

- `SettingsModal.tsx` (新建): 左侧导航（外观/终端/连接）+ 右侧面板弹窗。外观：字体大小（+/- 按钮 + range slider）；终端：光标样式（块状/下划线/竖线）+ 滚动行数；连接：超时毫秒 + 保活间隔秒
- `HostList.tsx`: 移除旧 `fontSize` state、`showSettings` state、`settingsRef`、outside-click useEffect、settings popover；新增 `showSettingsModal` state 和 `appSettings: AppSettings` state（含 terminal + connection）；设置按钮移至左侧工具栏（PanelLeft 按钮旁）；`TerminalPane` 新增传入 `cursorStyle`、`scrollback` props
- `TerminalPane.tsx`: 新增 `cursorStyle` 和 `scrollback` props；新增两个 useEffect 动态更新 xterm options

## Result

- 设置入口：左侧工具栏齿轮图标，点击弹出模态弹窗
- 外观分类：字体大小调节（8-24px，快捷键提示）
- 终端分类：光标样式切换 + 滚动行数配置
- 连接分类：连接超时 + 保活间隔
- 移除 Tab bar 右侧旧设置按钮及 popover
