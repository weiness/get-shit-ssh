import { Download, Upload, CheckCircle, XCircle, Trash2, X } from 'lucide-react'
import { useTransferStore } from '../../stores/transferStore'

interface TransferHistoryProps {
  onClose: () => void
}

export function TransferHistory({ onClose }: TransferHistoryProps) {
  const { records, clearRecords } = useTransferStore()

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <span className="text-sm font-medium flex-1">传输记录</span>
        {records.length > 0 && (
          <button
            onClick={clearRecords}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
            title="清空记录"
          >
            <Trash2 size={14} />
          </button>
        )}
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
          title="关闭"
        >
          <X size={14} />
        </button>
      </div>

      {/* Records list */}
      <div className="flex-1 overflow-y-auto p-2">
        {records.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            暂无传输记录
          </div>
        ) : (
          <div className="space-y-2">
            {records.map((record) => (
              <div
                key={record.id}
                className="flex items-start gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
              >
                <div className="shrink-0 mt-0.5">
                  {record.type === 'upload' ? (
                    <Upload size={14} className="text-blue-500" />
                  ) : (
                    <Download size={14} className="text-green-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{record.filename}</span>
                    {record.status === 'success' ? (
                      <CheckCircle size={14} className="text-green-500 shrink-0" />
                    ) : (
                      <XCircle size={14} className="text-red-500 shrink-0" />
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                    <div className="truncate">远程: {record.remotePath}</div>
                    <div className="truncate">本地: {record.localPath}</div>
                    {record.error && (
                      <div className="text-red-500">错误: {record.error}</div>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{formatTime(record.timestamp)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
