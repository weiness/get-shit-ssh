import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { RefreshCw, Copy, ClipboardPaste, Eraser } from 'lucide-react'
import { ClipboardGetText, ClipboardSetText } from '../../../wailsjs/runtime/runtime'
import { useThemeStore } from '../../stores/themeStore'
import { useTerminalIO } from '../../hooks/useTerminalIO'
import styles from './TerminalPane.module.css'

const DARK_TERMINAL_THEME = {
  background: '#1e1e2e',
  foreground: '#cdd6f4',
  cursor: '#f5e0dc',
  selectionBackground: '#585b70',
}

const LIGHT_TERMINAL_THEME = {
  background: '#fdf6e3',
  foreground: '#657b83',
  cursor: '#586e75',
  selectionBackground: '#eee8d5',
}

interface TerminalPaneProps {
  termID: string
  visible: boolean
  disconnected?: boolean
  fontSize?: number
  cursorStyle?: 'block' | 'underline' | 'bar'
  scrollback?: number
  onReconnect?: () => void
  onDisconnected?: () => void
  onKeyboardShortcut?: (e: KeyboardEvent) => boolean
}

export function TerminalPane({ termID, visible, disconnected, fontSize, cursorStyle, scrollback, onReconnect, onDisconnected, onKeyboardShortcut }: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const initializedRef = useRef(false)
  const [term, setTerm] = useState<Terminal | null>(null)
  const { theme } = useThemeStore()
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; hasSelection: boolean } | null>(null)
  const isMac = navigator.platform.includes('Mac')

  const { resize } = useTerminalIO(termID, term, onDisconnected)

  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return
    initializedRef.current = true

    const terminal = new Terminal({
      fontSize: 13,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: theme === 'dark' ? { ...DARK_TERMINAL_THEME } : { ...LIGHT_TERMINAL_THEME },
      cursorBlink: true,
    })

    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.open(containerRef.current)
    fitAddon.fit()
    terminal.focus()

    termRef.current = terminal
    fitAddonRef.current = fitAddon
    setTerm(terminal)

    const handleResize = () => {
      if (fitAddonRef.current && termRef.current) {
        fitAddonRef.current.fit()
        const { cols, rows } = termRef.current
        resize(rows, cols)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Use refs to avoid stale closures in xterm key handler
  const handleCopyRef = useRef<() => void>(() => {})
  const handlePasteRef = useRef<() => void>(() => {})

  // Attach custom keyboard shortcut handler to xterm (copy/paste + app shortcuts)
  useEffect(() => {
    if (!term) return
    term.attachCustomKeyEventHandler((e: KeyboardEvent) => {
      // macOS: Cmd+C / Cmd+V; Windows/Linux: Ctrl+Shift+C / Ctrl+Shift+V
      if (isMac) {
        if (e.metaKey && e.key === 'c') { handleCopyRef.current(); return false }
        if (e.metaKey && e.key === 'v') { handlePasteRef.current(); return false }
      } else {
        if (e.ctrlKey && e.shiftKey && e.key === 'C') { handleCopyRef.current(); return false }
        if (e.ctrlKey && e.shiftKey && e.key === 'V') { handlePasteRef.current(); return false }
      }
      return onKeyboardShortcut ? onKeyboardShortcut(e) : true
    })
  }, [term, onKeyboardShortcut, isMac])

  // Fit and focus when becoming visible
  useEffect(() => {
    if (visible && term && fitAddonRef.current) {
      setTimeout(() => {
        fitAddonRef.current?.fit()
        if (termRef.current) {
          const { cols, rows } = termRef.current
          resize(rows, cols)
          termRef.current.focus()
        }
      }, 50)
    }
  }, [visible, term, resize])

  // Update xterm theme when system theme changes
  useEffect(() => {
    if (!termRef.current) return
    const newTheme = theme === 'dark' ? DARK_TERMINAL_THEME : LIGHT_TERMINAL_THEME
    termRef.current.options.theme = { ...newTheme }
  }, [theme])

  // Update font size when prop changes
  useEffect(() => {
    if (!termRef.current || fontSize === undefined) return
    termRef.current.options.fontSize = fontSize
    fitAddonRef.current?.fit()
  }, [fontSize])

  // Update cursor style when prop changes
  useEffect(() => {
    if (!termRef.current || cursorStyle === undefined) return
    termRef.current.options.cursorStyle = cursorStyle
  }, [cursorStyle])

  // Update scrollback when prop changes
  useEffect(() => {
    if (!termRef.current || scrollback === undefined) return
    termRef.current.options.scrollback = scrollback
  }, [scrollback])

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return
    const handler = () => setContextMenu(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [contextMenu])

  const handleCopy = async () => {
    const text = termRef.current?.getSelection()
    if (text) await ClipboardSetText(text)
    setContextMenu(null)
  }
  handleCopyRef.current = handleCopy

  const handlePaste = async () => {
    const text = await ClipboardGetText()
    if (text && termRef.current) termRef.current.paste(text)
    setContextMenu(null)
  }
  handlePasteRef.current = handlePaste

  const handleClear = () => {
    termRef.current?.clear()
    setContextMenu(null)
  }

  return (
    <div
      className={styles.container}
      style={{ display: visible ? 'flex' : 'none', position: 'relative', backgroundColor: theme === 'dark' ? '#1e1e2e' : '#fdf6e3' }}
      onClick={() => { termRef.current?.focus(); setContextMenu(null) }}
      onContextMenu={(e) => {
        e.preventDefault()
        const hasSelection = (termRef.current?.getSelection()?.length ?? 0) > 0
        setContextMenu({ x: e.clientX, y: e.clientY, hasSelection })
      }}
    >
      <div ref={containerRef} className={styles.terminalContainer} />

      {/* Context menu */}
      {contextMenu && (
        <div
          style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 9999 }}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 min-w-36"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            disabled={!contextMenu.hasSelection}
            onClick={handleCopy}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-left disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
          >
            <Copy size={13} /> 复制
            <span className="ml-auto text-xs text-gray-400">{isMac ? '⌘C' : 'Ctrl+Shift+C'}</span>
          </button>
          <button
            onClick={handlePaste}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
          >
            <ClipboardPaste size={13} /> 粘贴
            <span className="ml-auto text-xs text-gray-400">{isMac ? '⌘V' : 'Ctrl+Shift+V'}</span>
          </button>
          <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
          <button
            onClick={handleClear}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
          >
            <Eraser size={13} /> 清空
          </button>
        </div>
      )}

      {/* Floating action area — bottom-right */}
      {disconnected && onReconnect && (
        <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2 items-end pointer-events-none">
          <button
            onClick={(e) => { e.stopPropagation(); onReconnect() }}
            className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 bg-red-500/80 hover:bg-red-500 text-white text-xs rounded-lg shadow-lg backdrop-blur-sm transition-colors"
          >
            <RefreshCw size={12} />
            重新连接
          </button>
        </div>
      )}
    </div>
  )
}
