---
phase: 04-终端体验优化
plan: 01
status: completed
---

# 04-01 Summary: 终端主题联动

## What was done

- `TerminalPane.tsx`: 添加 `useThemeStore` 订阅，定义 `DARK_TERMINAL_THEME`/`LIGHT_TERMINAL_THEME` 常量，初始化时根据当前主题选择配色，添加 `useEffect` 响应主题变化实时更新 xterm 颜色，容器 div 动态 `backgroundColor`
- `TerminalPane.module.css`: 移除硬编码 `background-color: #1e1e2e`，改由 inline style 动态控制
- `TerminalTabBar.tsx`: 添加 `useThemeStore`，激活 tab 背景色/文字色根据主题动态切换（暗色 `#1e1e2e`/`text-green-400`，亮色 `#fdf6e3`/`text-[#657b83]`）
- `QuickConnectPane.tsx`: 添加 `useThemeStore`，容器背景色跟随主题动态切换

## Result

亮色主题下终端显示 Solarized Light 配色（bg #fdf6e3, fg #657b83），暗色保持 Catppuccin Mocha（bg #1e1e2e, fg #cdd6f4），切换主题实时生效，激活 tab 和 QuickConnectPane 背景色完全同步。
