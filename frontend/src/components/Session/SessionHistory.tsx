import { useEffect, useState } from 'react'
import { History, Trash2, Server, Clock, RefreshCw } from 'lucide-react'
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

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const result = await App.ListSessionLogs()
      setLogs((result ?? []) as SessionLog[])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLogs() }, [])

  const handleClear = async () => {
    if (!confirm('清除所有连接历史?')) return
    await App.ClearSessionLogs()
    setLogs([])
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-5 pb-3 shrink-0">
        <h2 className="text-base font-semibold">连接历史</h2>
        <div className="flex items-center gap-2">
          <button onClick={fetchLogs} title="刷新"
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={handleClear} disabled={logs.length === 0}
            className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 disabled:opacity-30 transition-colors">
            <Trash2 size={13} />
            清除
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading && <div className="text-center py-8 text-gray-400 text-sm">加载中...</div>}

        {!loading && logs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
            <History size={36} className="opacity-20" />
            <p className="text-sm">暂无连接历史</p>
          </div>
        )}

        <div className="space-y-1.5">
          {logs.map((log) => (
            <div key={log.id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                <Server size={15} className="text-gray-400" />
              </div>
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
                    <Clock size={10} />
                    {formatDuration(log.duration)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
