import { useEffect, useState } from 'react'
import { History, Trash2, Server, Clock } from 'lucide-react'
import * as App from '../../../wailsjs/go/main/App'
import { store } from '../../../wailsjs/go/models'

type SessionLog = store.SessionLog

function formatDuration(secs: number): string {
  if (secs <= 0) return '进行中'
  if (secs < 60) return `${secs}s`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`
  return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`
}

export function SessionHistory() {
  const [logs, setLogs] = useState<SessionLog[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = async () => {
    setLoading(true)
    try {
      const result = await App.ListSessionLogs()
      setLogs((result ?? []) as SessionLog[])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetch() }, [])

  const handleClear = async () => {
    if (!confirm('清除所有连接历史?')) return
    await App.ClearSessionLogs()
    setLogs([])
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">连接历史</h1>
        <button
          onClick={handleClear}
          disabled={logs.length === 0}
          className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 disabled:opacity-40 transition-colors"
        >
          <Trash2 size={16} />
          清除历史
        </button>
      </div>

      {loading && <div className="text-center py-8 text-gray-400">加载中...</div>}

      {!loading && logs.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <History size={40} className="mx-auto mb-3 opacity-30" />
          <p>暂无连接历史</p>
        </div>
      )}

      <div className="space-y-2">
        {logs.map((log) => (
          <div
            key={log.id}
            className="flex items-center gap-4 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Server size={18} className="text-gray-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{log.hostName}</span>
                <span className="text-xs text-gray-400 font-mono">{log.username}@{log.address}</span>
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs text-gray-400">
                  {new Date(log.connectedAt * 1000).toLocaleString()}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock size={11} />
                  {formatDuration(log.duration)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
