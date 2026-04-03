import { create } from 'zustand'
import { Host } from '../types/host'

// Wails bindings will be generated at runtime
type AppBindings = {
  ListHosts: () => Promise<Host[]>
  CreateHost: (host: Host) => Promise<void>
  UpdateHost: (host: Host) => Promise<void>
  DeleteHost: (id: string) => Promise<void>
}

declare global {
  interface Window {
    App: AppBindings
  }
}

interface HostStore {
  hosts: Host[]
  loading: boolean
  error: string | null
  fetchHosts: () => Promise<void>
  addHost: (host: Host) => Promise<void>
  updateHost: (host: Host) => Promise<void>
  removeHost: (id: string) => Promise<void>
}

export const useHostStore = create<HostStore>((set) => ({
  hosts: [],
  loading: false,
  error: null,

  fetchHosts: async () => {
    set({ loading: true, error: null })
    try {
      const hosts = await window.App.ListHosts()
      set({ hosts: hosts || [] })
    } catch (err) {
      set({ error: (err as Error).message })
    } finally {
      set({ loading: false })
    }
  },

  addHost: async (host: Host) => {
    try {
      await window.App.CreateHost(host)
      set((state) => ({ hosts: [...state.hosts, host] }))
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  updateHost: async (host: Host) => {
    try {
      await window.App.UpdateHost(host)
      set((state) => ({
        hosts: state.hosts.map((h) => (h.id === host.id ? host : h)),
      }))
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  removeHost: async (id: string) => {
    try {
      await window.App.DeleteHost(id)
      set((state) => ({
        hosts: state.hosts.filter((h) => h.id !== id),
      }))
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },
}))
