import { create } from 'zustand'
import * as App from '../../wailsjs/go/main/App'

export interface Session {
  id: string
  hostName: string
  termID: string
  status: 'connecting' | 'connected' | 'disconnected'
}

interface SessionStore {
  sessions: Map<string, Session>
  connect: (hostID: string, hostName: string) => Promise<string>
  openTerminal: (sessionID: string, rows: number, cols: number) => Promise<string>
  closeTerminal: (termID: string) => Promise<void>
  disconnect: (sessionID: string) => Promise<void>
  getSession: (sessionID: string) => Session | undefined
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessions: new Map(),

  connect: async (hostID, hostName) => {
    set((state) => ({
      sessions: new Map(state.sessions).set(hostID, {
        id: hostID, hostName, termID: '', status: 'connecting',
      }),
    }))
    try {
      const sessionID = await App.SSHConnect(hostID)
      set((state) => {
        const sessions = new Map(state.sessions)
        const session = sessions.get(hostID)
        if (session) sessions.set(hostID, { ...session, id: sessionID, status: 'connected' })
        return { sessions }
      })
      return sessionID
    } catch (error) {
      set((state) => {
        const sessions = new Map(state.sessions)
        const session = sessions.get(hostID)
        if (session) sessions.set(hostID, { ...session, status: 'disconnected' })
        return { sessions }
      })
      throw error
    }
  },

  openTerminal: async (sessionID, rows, cols) => {
    const termID = await App.OpenTerminal(sessionID, rows, cols)
    set((state) => {
      const sessions = new Map(state.sessions)
      const session = sessions.get(sessionID)
      if (session) sessions.set(sessionID, { ...session, termID })
      return { sessions }
    })
    return termID
  },

  closeTerminal: async (termID) => {
    try { await App.TerminalClose(termID) } catch { /* best-effort */ }
  },

  disconnect: async (sessionID) => {
    try {
      await App.SSHDisconnect(sessionID)
      set((state) => {
        const sessions = new Map(state.sessions)
        sessions.delete(sessionID)
        return { sessions }
      })
    } catch { /* best-effort */ }
  },

  getSession: (sessionID) => get().sessions.get(sessionID),
}))
