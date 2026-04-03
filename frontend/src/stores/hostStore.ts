import { create } from 'zustand'
import { Host } from '../types/host'
import { ListHosts, CreateHost, UpdateHost, DeleteHost } from '../../wails/go/main/App'

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
      const hosts = await ListHosts()
      set({ hosts: hosts || [] })
    } catch (err) {
      set({ error: (err as Error).message })
    } finally {
      set({ loading: false })
    }
  },

  addHost: async (host: Host) => {
    try {
      await CreateHost(host)
      set((state) => ({ hosts: [...state.hosts, host] }))
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  updateHost: async (host: Host) => {
    try {
      await UpdateHost(host)
      set((state) => ({
        hosts: state.hosts.map((h) => (h.id === host.id ? host : h)),
      }))
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  removeHost: async (id: string) => {
    try {
      await DeleteHost(id)
      set((state) => ({
        hosts: state.hosts.filter((h) => h.id !== id),
      }))
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },
}))
