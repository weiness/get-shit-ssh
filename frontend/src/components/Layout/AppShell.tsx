import { useState } from 'react'
import { AppMenu } from '../Menu/AppMenu'
import { HostList } from '../Host/HostList'
import { KeyList } from '../KeyManager/KeyList'
import { Server, Key } from 'lucide-react'

type Page = 'hosts' | 'keys'

export function AppShell() {
  const [page, setPage] = useState<Page>('hosts')

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-300 dark:border-gray-700 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold">GSS</h1>
          <nav className="flex gap-1">
            <button
              onClick={() => setPage('hosts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                page === 'hosts'
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              <Server size={16} />
              主机管理
            </button>
            <button
              onClick={() => setPage('keys')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                page === 'keys'
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              <Key size={16} />
              SSH 密钥
            </button>
          </nav>
        </div>
        <AppMenu />
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {page === 'hosts' && <HostList />}
        {page === 'keys' && <KeyList />}
      </main>
    </div>
  )
}
