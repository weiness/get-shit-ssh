import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { useTerminalIO } from '../../hooks/useTerminalIO'
import { useSessionStore } from '../../stores/sessionStore'
import styles from './TerminalPane.module.css'

interface TerminalPaneProps {
  termID: string
  onClose: () => void
}

export function TerminalPane({ termID, onClose }: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [initialized, setInitialized] = useState(false)

  const { resize } = useTerminalIO(termID, termRef.current)

  useEffect(() => {
    if (!containerRef.current || initialized) return

    // Initialize xterm
    const term = new Terminal({
      fontSize: 13,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e2e',
        foreground: '#cdd6f4',
      },
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(containerRef.current)
    fitAddon.fit()

    termRef.current = term
    fitAddonRef.current = fitAddon
    setInitialized(true)

    // Handle window resize
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
  }, [initialized, resize])

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>Terminal: {termID}</span>
        <button className={styles.closeBtn} onClick={onClose}>
          ✕
        </button>
      </div>
      <div className={styles.terminalContainer} ref={containerRef} />
    </div>
  )
}
