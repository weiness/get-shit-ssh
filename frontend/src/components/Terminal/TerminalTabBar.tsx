import { X, Terminal } from 'lucide-react'

export interface TermTab {
  termID: string
  sessionID: string
  hostName: string
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
    <div className="flex items-center gap-0 overflow-x-auto shrink-0 bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600">
      {tabs.map((tab) => {
        const isActive = tab.termID === activeTermID
        return (
          <div
            key={tab.termID}
            onClick={() => onSelect(tab.termID)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer border-r border-gray-300 dark:border-gray-600 whitespace-nowrap select-none transition-colors ${
              isActive
                ? 'bg-gray-900 text-green-400'
                : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            <Terminal size={12} />
            <span>{tab.hostName}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onClose(tab.termID, tab.sessionID) }}
              className={`ml-1 rounded hover:bg-gray-600/30 p-0.5 ${isActive ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              <X size={11} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
