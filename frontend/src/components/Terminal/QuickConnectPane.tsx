import { Terminal, Server } from 'lucide-react'
import { Host } from '../../types/host'
import { useThemeStore } from '../../stores/themeStore'

interface QuickConnectPaneProps {
  hosts: Host[]
  connectingHosts: Set<string>
  onConnect: (hostID: string, hostName: string) => void
}

export function QuickConnectPane({ hosts, connectingHosts, onConnect }: QuickConnectPaneProps) {
  const { theme } = useThemeStore()
  return (
    <div className={`flex flex-col items-center justify-center h-full text-gray-700 dark:text-gray-300 px-8 gap-6 ${theme === 'dark' ? 'bg-[#1e1e2e]' : 'bg-[#fdf6e3]'}`}>
      <div className="flex flex-col items-center gap-2 text-center">
        <Server size={32} className="text-blue-400 opacity-60" />
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">选择主机连接</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500">选择一台主机打开终端会话</p>
      </div>

      {hosts.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">暂无主机，请先添加主机</p>
      ) : (
        <div className="w-full max-w-sm flex flex-col gap-1">
          {hosts.map((host) => (
            <button
              key={host.id}
              disabled={connectingHosts.has(host.id)}
              onClick={() => onConnect(host.id, host.name)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 transition-all text-left group shadow-sm"
            >
              <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center shrink-0 group-hover:bg-green-500/25 transition-colors">
                <Terminal size={15} className="text-green-500 dark:text-green-400" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{host.name}</div>
                <div className="text-[11px] text-gray-400 dark:text-gray-500 font-mono truncate">{host.username}@{host.host}:{host.port}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
