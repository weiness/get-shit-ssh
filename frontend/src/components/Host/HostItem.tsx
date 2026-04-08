import { Host } from '../../types/host'
import { Terminal, FolderOpen, Edit2, Trash2, Key, Lock } from 'lucide-react'

interface HostItemProps {
  host: Host
  onEdit: (host: Host) => void
  onDelete: (id: string) => void
  onConnect: (hostID: string, hostName: string) => void
  onFiles: (hostID: string, hostName: string) => void
  connecting?: boolean
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500',
  'bg-pink-500', 'bg-teal-500', 'bg-red-500', 'bg-indigo-500',
]

function avatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function HostItem({ host, onEdit, onDelete, onConnect, onFiles, connecting }: HostItemProps) {
  const color = avatarColor(host.name)
  const initial = host.name.charAt(0).toUpperCase()

  return (
    <div className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white dark:hover:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all cursor-default">
      {/* Avatar */}
      <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center shrink-0`}>
        <span className="text-white text-sm font-bold">{initial}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{host.name}</span>
          {host.groupName && (
            <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-md shrink-0">
              {host.groupName}
            </span>
          )}
          {host.authType === 'key' ? (
            <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-md shrink-0">
              <Key size={9} />密钥
            </span>
          ) : host.authType === 'password' ? (
            <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md shrink-0">
              <Lock size={9} />密码
            </span>
          ) : null}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5 font-mono">
          {host.username}@{host.host}:{host.port}
        </p>
      </div>

      {/* Actions — show on hover */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={() => onConnect(host.id, host.name)}
          disabled={connecting}
          title="打开终端"
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors"
        >
          <Terminal size={13} />
          连接
        </button>
        <button
          onClick={() => onFiles(host.id, host.name)}
          title="文件管理"
          className="ml-1 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-purple-500 rounded-lg transition-colors"
        >
          <FolderOpen size={15} />
        </button>
        <button
          onClick={() => onEdit(host)}
          title="编辑"
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-500 rounded-lg transition-colors"
        >
          <Edit2 size={15} />
        </button>
        <button
          onClick={() => onDelete(host.id)}
          title="删除"
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}
