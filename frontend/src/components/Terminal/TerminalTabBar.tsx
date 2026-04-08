import { X, Terminal, Plus } from 'lucide-react'

export interface TermTab {
  termID: string
  sessionID: string
  hostID: string
  hostName: string
  isHome?: boolean
  status?: 'connected' | 'disconnected'
}

interface TerminalTabBarProps {
  tabs: TermTab[]
  activeTermID: string | null
  onSelect: (termID: string) => void
  onClose: (termID: string, sessionID: string) => void
}

export function TerminalTabBar({ tabs, activeTermID, onSelect, onClose }: TerminalTabBarProps) {
  if (tabs.length === 0) return null
  return (
    <div className="flex items-stretch overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = tab.termID === activeTermID
        const isDisconnected = tab.status === 'disconnected'
        return (
          <button
            key={tab.termID}
            onClick={() => onSelect(tab.termID)}
            className={`relative flex items-center gap-2 px-4 py-2 text-xs border-r border-gray-300 dark:border-gray-600 whitespace-nowrap select-none transition-colors ${
              isActive
                ? 'bg-[#1e1e2e] text-green-400'
                : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {isActive && <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500" />}
            {tab.isHome ? <Plus size={11} /> : <Terminal size={11} />}
            {/* Status dot */}
            {!tab.isHome && (
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isDisconnected ? 'bg-red-400' : 'bg-green-400'
              }`} />
            )}
            <span className={isDisconnected ? 'opacity-60' : ''}>{tab.hostName}</span>
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); onClose(tab.termID, tab.sessionID) }}
              className={`ml-1 rounded p-0.5 transition-colors ${
                isActive
                  ? 'text-gray-500 hover:text-white hover:bg-white/10'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-black/10 dark:hover:bg-white/10'
              }`}
            >
              <X size={10} />
            </span>
          </button>
        )
      })}
    </div>
  )
}
