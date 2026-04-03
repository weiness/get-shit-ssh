import { useEffect } from 'react'
import { Terminal } from '@xterm/xterm'
import { EventsOn } from '../../wailsjs/runtime/runtime'

export function useTerminalIO(termID: string, term: Terminal | null) {
  useEffect(() => {
    if (!term || !termID) return

    // Subscribe to terminal data events
    const offData = EventsOn('terminal:data:' + termID, (data: number[]) => {
      if (data && data.length > 0) {
        term.write(new Uint8Array(data))
      }
    })

    // Subscribe to terminal closed event
    const offClosed = EventsOn('terminal:closed', (id: string) => {
      if (id === termID) {
        term.write('\r\n[disconnected]\r\n')
      }
    })

    // Setup data handler for user input
    const onDataDispose = term.onData((data) => {
      sendInput(data)
    })

    return () => {
      offData()
      offClosed()
      onDataDispose.dispose()
    }
  }, [termID, term])

  const sendInput = async (data: string) => {
    try {
      await window.App.TerminalInput(termID, data)
    } catch (error) {
      console.error('Failed to send input:', error)
    }
  }

  const resize = async (rows: number, cols: number) => {
    try {
      await window.App.TerminalResize(termID, rows, cols)
    } catch (error) {
      console.error('Failed to resize terminal:', error)
    }
  }

  return { sendInput, resize }
}
