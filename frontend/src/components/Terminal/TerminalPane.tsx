import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { useTerminalIO } from '../../hooks/useTerminalIO'
import styles from './TerminalPane.module.css'

interface TerminalPaneProps {
  termID: string
  visible: boolean
}

export function TerminalPane({ termID, visible }: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const initializedRef = useRef(false)
  const [term, setTerm] = useState<Terminal | null>(null)

  const { resize } = useTerminalIO(termID, term)

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
      // Don't destroy terminal on StrictMode cleanup — only on real unmount
    }
  }, [])

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
      style={{ display: visible ? 'flex' : 'none' }}
      onClick={() => termRef.current?.focus()}
    >
      <div ref={containerRef} className={styles.terminalContainer} />
    </div>
  )
}
