import { create } from 'zustand'

export interface Session {
  id: string // sessionID (== hostID)
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
        id: hostID,
        hostName,
        termID: '',
        status: 'connecting',
      }),
    }))

    try {
      const sessionID = await window.App.SSHConnect(hostID)

      set((state) => {
        const sessions = new Map(state.sessions)
        const session = sessions.get(hostID)
        if (session) {
          sessions.set(hostID, { ...session, id: sessionID, status: 'connected' })
        }
        return { sessions }
      })

      return sessionID
    } catch (error) {
      set((state) => {
        const sessions = new Map(state.sessions)
        const session = sessions.get(hostID)
        if (session) {
          sessions.set(hostID, { ...session, status: 'disconnected' })
        }
        return { sessions }
      })
      throw error
    }
  },

  openTerminal: async (sessionID, rows, cols) => {
    try {
      const termID = await window.App.OpenTerminal(sessionID, rows, cols)

      set((state) => {
        const sessions = new Map(state.sessions)
        const session = sessions.get(sessionID)
        if (session) {
          sessions.set(sessionID, { ...session, termID })
        }
        return { sessions }
      })

      return termID
    } catch (error) {
      console.error('Failed to open terminal:', error)
      throw error
    }
  },

  closeTerminal: async (termID) => {
    try {
      await window.App.TerminalClose(termID)
    } catch (error) {
      console.error('Failed to close terminal:', error)
    }
  },

  disconnect: async (sessionID) => {
    try {
      await window.App.SSHDisconnect(sessionID)
      set((state) => {
        const sessions = new Map(state.sessions)
        sessions.delete(sessionID)
        return { sessions }
      })
    } catch (error) {
      console.error('Failed to disconnect:', error)
    }
  },

  getSession: (sessionID) => {
    return get().sessions.get(sessionID)
  },
}))
