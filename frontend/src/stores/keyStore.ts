import { create } from 'zustand'
import * as App from '../../wailsjs/go/main/App'

export interface KeyInfo {
  id: string
  name: string
  publicKey: string
  createdAt: number
}

interface KeyStore {
  keys: KeyInfo[]
  loading: boolean
  error: string | null

  fetchKeys: () => Promise<void>
  generateKey: (algorithm: string, name: string) => Promise<{ publicKey: string; keyID: string }>
  importKey: (pemData: string, name: string) => Promise<string>
  deleteKey: (id: string) => Promise<void>
  getPublicKey: (id: string) => Promise<string>
}

export const useKeyStore = create<KeyStore>((set, get) => ({
  keys: [],
  loading: false,
  error: null,

  fetchKeys: async () => {
    set({ loading: true, error: null })
    try {
      const keys = await App.ListSSHKeys()
      set({ keys: (keys ?? []) as KeyInfo[], loading: false })
    } catch (err) {
      set({ error: String(err), loading: false })
    }
  },

  generateKey: async (algorithm, name) => {
    const result = await App.GenerateSSHKey(algorithm, name)
    await get().fetchKeys()
    return { publicKey: result.publicKey, keyID: result.keyId }
  },

  importKey: async (pemData, name) => {
    const keyID = await App.ImportSSHKey(pemData, name)
    await get().fetchKeys()
    return keyID
  },

  deleteKey: async (id) => {
    await App.DeleteSSHKey(id)
    await get().fetchKeys()
  },

  getPublicKey: async (id) => {
    return App.GetPublicKey(id)
  },
}))
