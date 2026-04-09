# Phase 4: 终端体验优化 - Research

**Researched:** 2026-04-09
**Domain:** xterm.js theme reactivity, context menu, Wails clipboard, Tailwind dark mode
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TERM-01 | 终端区域右键弹出上下文菜单，包含「复制」「粘贴」「清空」 | 容器 div onContextMenu + SFTPBrowser 模式可直接复用 |
| TERM-02 | 「复制」仅在有选中文本时可用，无选中时置灰 | terminal.getSelection() 返回空字符串即无选中 |
| TERM-03 | 亮色主题下终端背景切换为护眼色，暗色保持 Catppuccin Mocha | terminal.options.theme = newObj 可在初始化后动态更新 |
| TERM-04 | 激活 tab 背景色与终端主题背景色联动 | useThemeStore 订阅 + 动态 Tailwind class |
| UX-03 | Tab 悬停显示完整主机信息 tooltip | HTML title 属性即可，TermTab 需扩展 username/host/port 字段 |
</phase_requirements>

## Summary

Phase 4 涉及五个独立但相关的改动，全部集中在 `TerminalPane.tsx`、`TerminalTabBar.tsx` 和 `TerminalPane.module.css` 三个文件内。

右键菜单（TERM-01/02）：xterm.js 没有内置 `onContextMenu` 事件，但 xterm 渲染的 canvas 元素会将 contextmenu 事件冒泡到父容器 div。因此在 `TerminalPane` 的容器 div 上挂 `onContextMenu` 处理器即可拦截，无需操作 shadow DOM 或 canvas 内部。这与 `SFTPBrowser.tsx` 已有的 contextMenu state 模式完全一致，可直接复用。

主题联动（TERM-03/04）：xterm.js 6.x 支持在初始化后通过 `terminal.options.theme = newThemeObject` 动态更新主题，但必须传入新对象（引用比较）。`themeStore` 使用 `data-theme` attribute 而非 `class`，Tailwind 4.x 已通过 `style.css` 中的 `@custom-variant dark` 正确配置。激活 tab 的硬编码 `bg-[#1e1e2e]` 需改为根据 theme 动态选择颜色。

Wails 剪贴板：Wails runtime 已暴露 `ClipboardGetText()` / `ClipboardSetText(text)` 给前端（见 `wailsjs/runtime/runtime.js`），这是比 `navigator.clipboard` 更可靠的跨平台方案，无需担心 WebView2/WebKit 权限问题。

**Primary recommendation:** 在 TerminalPane 容器 div 上挂 contextmenu 事件，用 Wails runtime clipboard API 处理复制粘贴，用 `terminal.options.theme = newObj` 响应 themeStore 变化，tab 激活色改为 CSS 变量或条件 class。

## Standard Stack

### Core（已安装，无需新增依赖）

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @xterm/xterm | ^6.0.0 | 终端渲染 | 已使用 |
| @xterm/addon-fit | ^0.11.0 | 自适应尺寸 | 已使用 |
| zustand | ^5.0.12 | 状态管理（themeStore） | 已使用 |
| Tailwind CSS | ^4.2.2 | 样式 | 已使用 |

**无需安装新依赖。** 所有功能用现有栈实现。

## Architecture Patterns

### 右键菜单模式（复用 SFTPBrowser）

SFTPBrowser 已有完整的 contextMenu 实现，模式如下：

```typescript
// 状态
const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

// 容器 div 上挂事件
<div onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY }) }}>

// 点击外部关闭
useEffect(() => {
  if (!contextMenu) return
  const handler = () => setContextMenu(null)
  document.addEventListener('click', handler)
  return () => document.removeEventListener('click', handler)
}, [contextMenu])

// 菜单渲染（fixed 定位）
{contextMenu && (
  <div style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 9999 }}
    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 min-w-36"
    onClick={(e) => e.stopPropagation()}>
    ...
  </div>
)}
```

### xterm.js 选中文本检测（TERM-02）

```typescript
// terminal.getSelection() 返回空字符串表示无选中
const hasSelection = terminal.getSelection().length > 0

// 置灰样式
<button
  disabled={!hasSelection}
  className="... disabled:opacity-40 disabled:cursor-not-allowed"
>
  复制
</button>
```

注意：xterm 选中状态在用户点击右键时已确定，`getSelection()` 在 contextmenu 事件处理时调用即可。

### Wails Clipboard API（TERM-01 复制/粘贴）

```typescript
import { ClipboardGetText, ClipboardSetText } from '../../../wailsjs/runtime/runtime'

// 复制
const handleCopy = async () => {
  const text = termRef.current?.getSelection()
  if (text) await ClipboardSetText(text)
  setContextMenu(null)
}

// 粘贴
const handlePaste = async () => {
  const text = await ClipboardGetText()
  if (text && termRef.current) termRef.current.paste(text)
  setContextMenu(null)
}

// 清空
const handleClear = () => {
  termRef.current?.clear()
  setContextMenu(null)
}
```

`terminal.paste(text)` 是 xterm.js 官方 API，会正确处理粘贴转义序列。

### xterm.js 动态主题更新（TERM-03）

```typescript
// 主题定义
const DARK_THEME = {
  background: '#1e1e2e',
  foreground: '#cdd6f4',
  cursor: '#f5e0dc',
  selectionBackground: '#585b70',
}

const LIGHT_THEME = {
  background: '#fdf6e3',  // Solarized Light base3
  foreground: '#657b83',  // Solarized Light base00
  cursor: '#586e75',
  selectionBackground: '#eee8d5',
}

// 在 useEffect 中响应 theme 变化
useEffect(() => {
  if (!termRef.current) return
  const newTheme = theme === 'dark' ? DARK_THEME : LIGHT_THEME
  // 必须传新对象，xterm 用引用比较检测变化
  termRef.current.options.theme = { ...newTheme }
}, [theme])
```

同时需要更新 `TerminalPane.module.css` 中硬编码的 `background-color: #1e1e2e`，改为 CSS 变量或动态 style prop。

### 激活 Tab 背景色联动（TERM-04）

当前问题：`TerminalTabBar.tsx` line 33 硬编码 `bg-[#1e1e2e]`，亮色主题下不正确。

解决方案：将终端背景色作为 prop 传入 TerminalTabBar，或在 TerminalTabBar 内订阅 themeStore：

```typescript
// 方案 A：TerminalTabBar 订阅 themeStore（更简单）
import { useThemeStore } from '../../stores/themeStore'

const { theme } = useThemeStore()
const activeBg = theme === 'dark' ? 'bg-[#1e1e2e]' : 'bg-[#fdf6e3]'

// 在 className 中使用
isActive ? `${activeBg} text-green-400` : '...'
```

同时 `QuickConnectPane.tsx` 的 `dark:bg-[#1e1e2e]` 也需要同步修改为亮色时使用 `bg-[#fdf6e3]`。

### Tab Tooltip（UX-03）

`TermTab` 接口当前只有 `hostName`，缺少 `username`、`host`、`port`。需要扩展接口并在创建 tab 时填充。

```typescript
// TerminalTabBar.tsx 中的 TermTab 接口扩展
export interface TermTab {
  termID: string
  sessionID: string
  hostID: string
  hostName: string
  hostUser?: string   // 新增
  hostAddr?: string   // 新增（host:port）
  isHome?: boolean
  status?: 'connected' | 'disconnected'
}

// 在 button 上加 title 属性
<button
  title={tab.isHome ? '新连接' : `${tab.hostName}\n${tab.hostUser}@${tab.hostAddr}`}
  ...
>
```

HTML `title` 属性是最简方案，无需引入 tooltip 组件库。浏览器原生 tooltip 在 Wails WebView 中正常工作。

### Anti-Patterns to Avoid

- **直接操作 xterm canvas DOM：** 不要用 `containerRef.current.querySelector('canvas')` 挂事件，容器 div 的 contextmenu 事件冒泡已足够。
- **`navigator.clipboard` 在 Wails 中：** 不要用 `navigator.clipboard.writeText/readText`，Wails runtime 的 `ClipboardSetText/ClipboardGetText` 是更可靠的跨平台方案。
- **mutate 现有 theme 对象：** `terminal.options.theme.background = '#fff'` 不会触发更新，必须 `terminal.options.theme = { ...newTheme }`。
- **CSS module 硬编码颜色：** `TerminalPane.module.css` 中的 `background-color: #1e1e2e` 需要改为动态，否则容器背景在亮色主题下不跟随。

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 剪贴板读写 | 自定义 Go binding | `ClipboardGetText/SetText` from wailsjs/runtime | 已内置，跨平台 |
| 终端粘贴 | 手动写入 terminal data | `terminal.paste(text)` | 处理粘贴转义序列 |
| Tooltip 组件 | 自定义 tooltip | HTML `title` attribute | 够用，零依赖 |
| 右键菜单组件 | 引入 Radix/Headless UI | 复用 SFTPBrowser 模式 | 已有实现，风格一致 |

## Common Pitfalls

### Pitfall 1: xterm theme 对象引用比较
**What goes wrong:** `terminal.options.theme.background = '#fff'` 无效，主题不更新。
**Why it happens:** xterm 6.x 用引用比较检测 options 变化。
**How to avoid:** 始终 `terminal.options.theme = { ...newTheme }` 传新对象。
**Warning signs:** 切换主题后终端颜色没变化。

### Pitfall 2: contextmenu 事件被 xterm 内部拦截
**What goes wrong:** 在容器 div 上挂 onContextMenu 但没有 `e.preventDefault()`，浏览器默认菜单仍然弹出。
**Why it happens:** contextmenu 事件默认行为是显示浏览器菜单。
**How to avoid:** 处理器第一行调用 `e.preventDefault()`。
**Warning signs:** 自定义菜单和浏览器菜单同时出现。

### Pitfall 3: CSS module 背景色与 xterm theme 不同步
**What goes wrong:** `TerminalPane.module.css` 的 `.container { background-color: #1e1e2e }` 在亮色主题下仍显示深色背景，xterm 渲染区域外的边缘区域颜色不一致。
**Why it happens:** CSS module 静态，不响应 themeStore。
**How to avoid:** 改为 inline style 或 CSS 变量，与 xterm theme 的 background 保持同步。
**Warning signs:** 终端区域边缘有深色条带。

### Pitfall 4: TermTab 缺少 user/host/port 字段
**What goes wrong:** UX-03 tooltip 只能显示 hostName，无法显示 `user@host:port`。
**Why it happens:** `TermTab` 接口当前只存 `hostName`，连接时没有把 Host 对象的其他字段存入 tab。
**How to avoid:** 在 `HostList.tsx` 的 `handleConnect` 中，从 `hosts` 数组找到对应 Host，将 `username`、`host`、`port` 存入新建的 TermTab。
**Warning signs:** tooltip 只显示主机名，没有 user@host:port。

### Pitfall 5: 亮色主题下 QuickConnectPane 背景不一致
**What goes wrong:** `QuickConnectPane.tsx` 有 `dark:bg-[#1e1e2e]`，但亮色主题下 `bg-gray-50` 与终端背景 `#fdf6e3` 不一致，视觉割裂。
**Why it happens:** QuickConnectPane 没有参与 TERM-03/04 的改动范围。
**How to avoid:** 同步修改 QuickConnectPane 的背景色，或接受轻微不一致（QuickConnectPane 不是终端，不需要完全一致）。

## Code Examples

### 完整 contextMenu state 类型

```typescript
interface ContextMenuState {
  x: number
  y: number
  hasSelection: boolean
}
```

### themeStore 订阅 + xterm 主题更新

```typescript
const { theme } = useThemeStore()

useEffect(() => {
  if (!termRef.current) return
  termRef.current.options.theme = theme === 'dark'
    ? { background: '#1e1e2e', foreground: '#cdd6f4', cursor: '#f5e0dc', selectionBackground: '#585b70' }
    : { background: '#fdf6e3', foreground: '#657b83', cursor: '#586e75', selectionBackground: '#eee8d5' }
}, [theme])
```

### 亮色主题颜色方案（Solarized Light）

| 用途 | 颜色 | Hex |
|------|------|-----|
| background | base3（最浅背景） | `#fdf6e3` |
| foreground | base00（正文） | `#657b83` |
| cursor | base01 | `#586e75` |
| selectionBackground | base2 | `#eee8d5` |

Solarized Light 是护眼终端配色的行业标准，对比度适中，长时间使用不疲劳。

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `terminal.setOption('theme', ...)` | `terminal.options.theme = newObj` | xterm 5.x+ 废弃 setOption |
| `navigator.clipboard` | Wails `ClipboardSetText/GetText` | 跨平台可靠，无权限问题 |

## Open Questions

1. **xterm contextmenu 在 Wails WebView2 中的行为**
   - What we know: 标准 DOM contextmenu 事件在 WebView2 中正常工作
   - What's unclear: Wails 是否有全局 contextmenu 拦截（某些 Wails 版本会禁用右键）
   - Recommendation: 实现后在 Windows 构建上验证，如有问题检查 `wails.json` 的 `browser.contextMenu` 配置

2. **QuickConnectPane 背景色是否需要同步**
   - What we know: QuickConnectPane 在 tab 激活时显示，背景与终端区域相邻
   - What's unclear: 产品上是否要求完全一致
   - Recommendation: 同步修改，保持视觉一致性，成本极低

## Environment Availability

Step 2.6: SKIPPED（纯前端代码改动，无外部工具依赖）

## Validation Architecture

> nyquist_validation 配置未找到，按默认启用处理。

### Test Framework

| Property | Value |
|----------|-------|
| Framework | 无自动化测试框架（项目当前无测试配置） |
| Config file | 无 |
| Quick run command | 手动验证（见下） |
| Full suite command | 手动验证 |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TERM-01 | 右键弹出菜单，三项操作可用 | manual | — | ❌ 无自动化 |
| TERM-02 | 无选中时复制置灰 | manual | — | ❌ 无自动化 |
| TERM-03 | 亮色主题终端背景变护眼色 | manual | — | ❌ 无自动化 |
| TERM-04 | 激活 tab 背景与终端背景一致 | manual | — | ❌ 无自动化 |
| UX-03 | Tab hover 显示 user@host:port | manual | — | ❌ 无自动化 |

### Wave 0 Gaps

项目无测试基础设施，所有验证为手动。计划中应包含明确的手动验证步骤清单。

## Sources

### Primary (HIGH confidence)
- [xtermjs.org Terminal class docs](https://xtermjs.org/docs/api/terminal/classes/terminal/) — getSelection(), clear(), paste(), options.theme
- [xtermjs.org ITheme interface](https://xtermjs.org/docs/api/terminal/interfaces/itheme/) — 完整 theme 属性列表
- `frontend/wailsjs/runtime/runtime.js` — ClipboardGetText/ClipboardSetText 确认存在
- `frontend/src/style.css` — `@custom-variant dark` 配置确认 data-theme 方案
- `frontend/src/components/FileManager/SFTPBrowser.tsx` — contextMenu 实现参考

### Secondary (MEDIUM confidence)
- [Solarized color palette](https://gist.github.com/mosioc/b9e28280df33ebdb42db2bd2abf9acb9) — 亮色主题颜色值
- [xterm.js GitHub issue #312](https://github.com/xtermjs/xterm.js/issues/312) — contextmenu 事件在容器 div 上可拦截

### Tertiary (LOW confidence)
- WebSearch: Wails clipboard WebView2 兼容性 — 未找到官方文档确认，但 runtime.js 中存在 API 本身是强证据

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 全部已安装，版本已确认
- Architecture: HIGH — xterm API 经官方文档验证，SFTPBrowser 模式已在项目中运行
- Pitfalls: HIGH — 基于代码审查发现的具体问题
- Wails clipboard: MEDIUM — runtime.js 中 API 存在，但 WebView2 实际行为未在本机验证

**Research date:** 2026-04-09
**Valid until:** 2026-05-09（xterm.js 和 Wails 均为稳定版本）
