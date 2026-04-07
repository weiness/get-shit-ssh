import { create } from 'zustand'

export interface TransferRecord {
  id: string
  type: 'upload' | 'download'
  filename: string
  remotePath: string
  localPath: string
  status: 'success' | 'error'
  timestamp: number
  error?: string
}

interface TransferStore {
  records: TransferRecord[]
  addRecord: (record: Omit<TransferRecord, 'id' | 'timestamp'>) => void
  clearRecords: () => void
}

export const useTransferStore = create<TransferStore>((set) => ({
  records: [],

  addRecord: (record) => {
    const newRecord: TransferRecord = {
      ...record,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
    }
    set((state) => ({
      records: [newRecord, ...state.records].slice(0, 100), // Keep last 100 records
    }))
  },

  clearRecords: () => set({ records: [] }),
}))
