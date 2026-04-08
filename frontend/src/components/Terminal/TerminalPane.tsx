import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { RefreshCw } from 'lucide-react'
import { useTerminalIO } from '../../hooks/useTerminalIO'
import styles from './TerminalPane.module.css'

interface TerminalPaneProps {
  termID: string
  visible: boolean
  disconnected?: boolean
  onReconnect?: () => void
  onDisconnected?: () => void
  onKeyboardShortcut?: (e: KeyboardEvent) => boolean
}

export function TerminalPane({ termID, visible, disconnected, onReconnect, onDisconnected, onKeyboardShortcut }: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const initializedRef = useRef(false)
  const [term, setTerm] = useState<Terminal | null>(null)

  const { resize } = useTerminalIO(termID, term, onDisconnected)

  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return
    initializedRef.current = true

    const terminal = new Terminal({
      fontSize: 13,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e2e',
        foreground: '#cdd6f4',
      },
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

  // Attach custom keyboard shortcut handler to xterm
  useEffect(() => {
    if (term && onKeyboardShortcut) {
      term.attachCustomKeyEventHandler(onKeyboardShortcut)
    }
  }, [term, onKeyboardShortcut])

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

  return (
    <div
      className={styles.container}
      style={{ display: visible ? 'flex' : 'none', position: 'relative' }}
      onClick={() => termRef.current?.focus()}
    >
      <div ref={containerRef} className={styles.terminalContainer} />

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
