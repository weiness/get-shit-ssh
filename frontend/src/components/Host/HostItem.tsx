import { Host } from '../../types/host'
import { Edit2, Trash2, Server, Terminal, FolderOpen, Lock, Key } from 'lucide-react'

interface HostItemProps {
  host: Host
  onEdit: (host: Host) => void
  onDelete: (id: string) => void
  onConnect: (hostID: string, hostName: string) => void
  onFiles: (hostID: string, hostName: string) => void
}

export function HostItem({ host, onEdit, onDelete, onConnect, onFiles }: HostItemProps) {
  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Server size={20} className="text-gray-400 shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium truncate">{host.name}</p>
            {host.groupName && (
              <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded">
                {host.groupName}
              </span>
            )}
            {host.authType === 'key' ? (
              <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded">
                <Key size={10} /> 密钥
              </span>
            ) : host.authType === 'password' ? (
              <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                <Lock size={10} /> 密码
              </span>
            ) : null}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {host.username}@{host.host}:{host.port}
          </p>
        </div>
      </div>

      <div className="flex gap-1 shrink-0 ml-2">
        <button onClick={() => onConnect(host.id, host.name)}
          className="p-2 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors" title="打开终端">
          <Terminal size={17} className="text-green-500" />
        </button>
        <button onClick={() => onFiles(host.id, host.name)}
          className="p-2 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors" title="文件管理">
          <FolderOpen size={17} className="text-purple-500" />
        </button>
        <button onClick={() => onEdit(host)}
          className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="编辑">
          <Edit2 size={17} className="text-blue-500" />
        </button>
        <button onClick={() => onDelete(host.id)}
          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="删除">
          <Trash2 size={17} className="text-red-500" />
        </button>
      </div>
    </div>
  )
}
