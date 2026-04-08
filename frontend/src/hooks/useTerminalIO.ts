import { useEffect, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { EventsOn } from '../../wailsjs/runtime/runtime'
import * as App from '../../wailsjs/go/main/App'

export function useTerminalIO(termID: string, term: Terminal | null, onDisconnected?: () => void) {
  useEffect(() => {
    if (!term || !termID) return

    const offData = EventsOn('terminal:data:' + termID, (data: string) => {
      if (data) term.write(data)
    })

    const offClosed = EventsOn('terminal:closed:' + termID, () => {
      term.write('\r\n\x1b[31m[连接已断开]\x1b[0m\r\n')
      onDisconnected?.()
    })

    const onDataDispose = term.onData((data) => {
      App.TerminalInput(termID, data).catch(console.error)
    })

    return () => {
      offData(); offClosed(); onDataDispose.dispose()
    }
  }, [termID, term, onDisconnected])

  const resize = useCallback((rows: number, cols: number) =>
    App.TerminalResize(termID, rows, cols).catch(console.error),
  [termID])

  return { resize }
}
