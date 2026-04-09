---
phase: 04-终端体验优化
plan: 02
status: completed
---

# 04-02 Summary: 右键菜单 + Tab Tooltip

## What was done

- `TerminalTabBar.tsx`: `TermTab` 接口新增 `hostUser?: string` 和 `hostAddr?: string` 字段；tab button 添加 `title` 属性显示 `主机名\nuser@host:port`（home tab 显示"新连接"）
- `HostList.tsx`: `handleConnect` 和 `handleReconnect` 创建 `newTab` 时从 `hosts` 数组查找对应主机，填充 `hostUser` 和 `hostAddr`；两个 `useCallback` 依赖数组加入 `hosts`
- `TerminalPane.tsx`: 添加 `ClipboardGetText`/`ClipboardSetText` 和 `Copy`/`ClipboardPaste`/`Eraser` 图标 import；添加 `contextMenu` state；添加 document click 关闭菜单的 `useEffect`；实现 `handleCopy`/`handlePaste`/`handleClear` 三个 handler；容器 div 添加 `onContextMenu` 事件；渲染右键菜单（fixed 定位，z-index 9999，复制按钮无选中时 disabled+opacity-40）

## Result

终端区域右键弹出自定义菜单（复制/粘贴/清空），无选中文本时复制置灰，复制/粘贴使用 Wails clipboard API，清空调用 terminal.clear()；Tab hover 显示完整主机信息 tooltip。
