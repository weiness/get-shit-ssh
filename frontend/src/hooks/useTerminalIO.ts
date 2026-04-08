import { useEffect, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { EventsOn } from '../../wailsjs/runtime/runtime'
import * as App from '../../wailsjs/go/main/App'

export function useTerminalIO(termID: string, term: Terminal | null) {
  useEffect(() => {
    if (!term || !termID) {
      console.log('[useTerminalIO] Skipping setup:', { term: !!term, termID })
      return
    }

    console.log('[useTerminalIO] Setting up for termID:', termID)

    const offData = EventsOn('terminal:data:' + termID, (data: string) => {
      if (data) term.write(data)
    })

    const offClosed = EventsOn('terminal:closed:' + termID, () => {
      console.log('[useTerminalIO] Terminal closed:', termID)
      term.write('\r\n[disconnected]\r\n')
    })

    const onDataDispose = term.onData((data) => {
      console.log('[useTerminalIO] Sending input:', data.length, 'chars')
      App.TerminalInput(termID, data).catch(console.error)
    })

    return () => {
      console.log('[useTerminalIO] Cleanup for termID:', termID)
      offData(); offClosed(); onDataDispose.dispose()
    }
  }, [termID, term])

  const resize = useCallback((rows: number, cols: number) =>
    App.TerminalResize(termID, rows, cols).catch(console.error),
  [termID])

  return { resize }
}
