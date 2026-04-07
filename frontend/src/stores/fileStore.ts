import { create } from 'zustand'
import * as App from '../../wailsjs/go/main/App'

export interface FileInfo {
  name: string
  path: string
  size: number
  mode: string
  isDir: boolean
  modTime: number
}

interface FileStore {
  sftpID: string | null
  currentPath: string
  entries: FileInfo[]
  loading: boolean
  error: string | null

  openSFTP: (sessionID: string) => Promise<void>
  closeSFTP: () => Promise<void>
  listDir: (path: string) => Promise<void>
  refresh: () => Promise<void>
  download: (remotePath: string, localPath: string) => Promise<void>
  upload: (localPath: string, remotePath: string) => Promise<void>
  deleteFile: (remotePath: string) => Promise<void>
  rename: (oldPath: string, newPath: string) => Promise<void>
  mkdir: (remotePath: string) => Promise<void>
}

export const useFileStore = create<FileStore>((set, get) => ({
  sftpID: null,
  currentPath: '/',
  entries: [],
  loading: false,
  error: null,

  openSFTP: async (sessionID) => {
    set({ loading: true, error: null })
    try {
      const sftpID = await App.SFTPOpen(sessionID)
      const wd = await App.SFTPGetwd(sftpID)
      set({ sftpID, currentPath: wd, loading: false })
      await get().listDir(wd)
    } catch (err) {
      set({ error: String(err), loading: false })
      throw err
    }
  },

  closeSFTP: async () => {
    const { sftpID } = get()
    if (!sftpID) return
    try {
      await App.SFTPClose(sftpID)
    } catch (_) {
      // best-effort
    }
    set({ sftpID: null, entries: [], currentPath: '/' })
  },

  listDir: async (path) => {
    const { sftpID } = get()
    if (!sftpID) return
    set({ loading: true, error: null })
    try {
      const entries = await App.SFTPListDir(sftpID, path)
      set({ entries: (entries ?? []) as FileInfo[], currentPath: path, loading: false })
    } catch (err) {
      set({ error: String(err), loading: false })
    }
  },

  refresh: async () => {
    await get().listDir(get().currentPath)
  },

  download: async (remotePath, localPath) => {
    const { sftpID } = get()
    if (!sftpID) throw new Error('SFTP not open')
    await App.SFTPDownload(sftpID, remotePath, localPath)
  },

  upload: async (localPath, remotePath) => {
    const { sftpID } = get()
    if (!sftpID) throw new Error('SFTP not open')
    await App.SFTPUpload(sftpID, localPath, remotePath)
    await get().refresh()
  },

  deleteFile: async (remotePath) => {
    const { sftpID } = get()
    if (!sftpID) throw new Error('SFTP not open')
    await App.SFTPDelete(sftpID, remotePath)
    await get().refresh()
  },

  rename: async (oldPath, newPath) => {
    const { sftpID } = get()
    if (!sftpID) throw new Error('SFTP not open')
    await App.SFTPRename(sftpID, oldPath, newPath)
    await get().refresh()
  },

  mkdir: async (remotePath) => {
    const { sftpID } = get()
    if (!sftpID) throw new Error('SFTP not open')
    await App.SFTPMkdir(sftpID, remotePath)
    await get().refresh()
  },
}))
