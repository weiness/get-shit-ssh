import { create } from 'zustand'
import * as App from '../../wailsjs/go/main/App'
import { Host } from '../types/host'

interface HostStore {
  hosts: Host[]
  loading: boolean
  error: string | null
  fetchHosts: () => Promise<void>
  addHostWithPassword: (host: Host, password: string) => Promise<void>
  addHostWithKey: (host: Host, keyID: string) => Promise<void>
  updateHostWithPassword: (host: Host, password: string) => Promise<void>
  updateHostWithKey: (host: Host, keyID: string) => Promise<void>
  removeHost: (id: string) => Promise<void>
}

export const useHostStore = create<HostStore>((set) => ({
  hosts: [],
  loading: false,
  error: null,

  fetchHosts: async () => {
    set({ loading: true, error: null })
    try {
      const hosts = await App.ListHosts()
      set({ hosts: (hosts as unknown as Host[]) || [], loading: false })
    } catch (err) {
      set({ error: String(err), loading: false })
    }
  },

  addHostWithPassword: async (host, password) => {
    await App.CreateHostWithPassword(host as any, password)
    const hosts = await App.ListHosts()
    set({ hosts: (hosts as unknown as Host[]) || [] })
  },

  addHostWithKey: async (host, keyID) => {
    await App.CreateHostWithKey(host as any, keyID)
    const hosts = await App.ListHosts()
    set({ hosts: (hosts as unknown as Host[]) || [] })
  },

  updateHostWithPassword: async (host, password) => {
    await App.UpdateHostWithPassword(host as any, password)
    const hosts = await App.ListHosts()
    set({ hosts: (hosts as unknown as Host[]) || [] })
  },

  updateHostWithKey: async (host, keyID) => {
    await App.UpdateHostWithKey(host as any, keyID)
    const hosts = await App.ListHosts()
    set({ hosts: (hosts as unknown as Host[]) || [] })
  },

  removeHost: async (id) => {
    await App.DeleteHost(id)
    set((state) => ({ hosts: state.hosts.filter((h) => h.id !== id) }))
  },
}))
