import { useState } from 'react'
import { HostList } from '../Host/HostList'
import { KeyList } from '../KeyManager/KeyList'
import { SessionHistory } from '../Session/SessionHistory'
import { SettingsModal, AppSettings } from '../Settings/SettingsModal'
import { useThemeStore } from '../../stores/themeStore'
import { Server, Key, History, Sun, Moon, Zap, Settings } from 'lucide-react'

type Page = 'hosts' | 'keys' | 'history'

const NAV_ITEMS = [
  { id: 'hosts',   label: '主机', icon: Server  },
  { id: 'keys',    label: '密钥', icon: Key     },
  { id: 'history', label: '历史', icon: History },
] as const

export function AppShell() {
  const [page, setPage] = useState<Page>('hosts')
  const { theme, setTheme } = useThemeStore()
  const [showSettings, setShowSettings] = useState(false)
  const [appSettings, setAppSettings] = useState<AppSettings>({
    terminal: { fontSize: 13, cursorStyle: 'block', scrollback: 5000 },
    connection: { connectTimeoutMs: 15000, keepaliveIntervalSec: 60 },
  })
  const isMac = navigator.platform.includes('Mac')

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden">
      {/* Narrow icon sidebar */}
      <aside className="w-14 shrink-0 flex flex-col bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        {/* Logo */}
        <div className="flex items-center justify-center h-14 border-b border-gray-200 dark:border-gray-700">
          <Zap size={20} className="text-blue-500" />
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col items-center py-3 gap-1">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const active = page === id
            return (
              <button
                key={id}
                onClick={() => setPage(id)}
                title={label}
                className={`relative w-10 h-10 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all ${
                  active
                    ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-500'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {active && (
                  <div className="absolute left-0 top-2.5 bottom-2.5 w-0.5 bg-blue-500 rounded-r-full" />
                )}
                <Icon size={17} />
                <span className="text-[9px] leading-none font-medium">{label}</span>
              </button>
            )
          })}
        </nav>

        {/* Settings + Theme toggle */}
        <div className="flex flex-col items-center pb-3 gap-1">
          <button
            onClick={() => setShowSettings(true)}
            title="设置"
            className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
          >
            <Settings size={17} />
          </button>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={theme === 'dark' ? '切换亮色' : '切换暗色'}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-hidden">
        {page === 'hosts'   && <HostList appSettings={appSettings} onSettingsChange={setAppSettings} />}
        {page === 'keys'    && <KeyList />}
        {page === 'history' && <SessionHistory />}
      </main>

      {showSettings && (
        <SettingsModal
          settings={appSettings}
          isMac={isMac}
          onClose={() => setShowSettings(false)}
          onChange={setAppSettings}
        />
      )}
    </div>
  )
}
