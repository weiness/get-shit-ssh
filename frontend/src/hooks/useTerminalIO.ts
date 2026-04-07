import { useEffect } from 'react'
import { Terminal } from '@xterm/xterm'
import { EventsOn } from '../../wailsjs/runtime/runtime'
import * as App from '../../wailsjs/go/main/App'

export function useTerminalIO(termID: string, term: Terminal | null) {
  useEffect(() => {
    if (!term || !termID) return

    const offData = EventsOn('terminal:data:' + termID, (data: number[]) => {
      if (data && data.length > 0) term.write(new Uint8Array(data))
    })

    const offClosed = EventsOn('terminal:closed', (id: string) => {
      if (id === termID) term.write('\r\n[disconnected]\r\n')
    })

    const onDataDispose = term.onData((data) => {
      App.TerminalInput(termID, data).catch(console.error)
    })

    return () => { offData(); offClosed(); onDataDispose.dispose() }
  }, [termID, term])

  const resize = (rows: number, cols: number) =>
    App.TerminalResize(termID, rows, cols).catch(console.error)

  return { resize }
}
