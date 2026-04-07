import { Host } from '../../types/host'
import { Edit2, Trash2, Server, Terminal, FolderOpen } from 'lucide-react'

interface HostItemProps {
  host: Host
  onEdit: (host: Host) => void
  onDelete: (id: string) => void
  onConnect: (hostID: string, hostName: string) => void
  onFiles: (hostID: string, hostName: string) => void
}

export function HostItem({ host, onEdit, onDelete, onConnect, onFiles }: HostItemProps) {
  return (
    <div className="flex items-center justify-between p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
      <div className="flex items-center gap-3 flex-1">
        <Server size={20} className="text-gray-500" />
        <div>
          <p className="font-medium">{host.name}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {host.username}@{host.host}:{host.port}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onConnect(host.id, host.name)}
          className="p-2 hover:bg-green-100 dark:hover:bg-green-900 rounded-lg transition-colors"
          title="打开终端"
        >
          <Terminal size={18} className="text-green-500" />
        </button>
        <button
          onClick={() => onFiles(host.id, host.name)}
          className="p-2 hover:bg-purple-100 dark:hover:bg-purple-900 rounded-lg transition-colors"
          title="文件管理"
        >
          <FolderOpen size={18} className="text-purple-500" />
        </button>
        <button
          onClick={() => onEdit(host)}
          className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg transition-colors"
          title="编辑"
        >
          <Edit2 size={18} className="text-blue-500" />
        </button>
        <button
          onClick={() => onDelete(host.id)}
          className="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-colors"
          title="删除"
        >
          <Trash2 size={18} className="text-red-500" />
        </button>
      </div>
    </div>
  )
}
