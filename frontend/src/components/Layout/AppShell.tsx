import { useState } from 'react'
import { AppMenu } from '../Menu/AppMenu'
import { HostList } from '../Host/HostList'
import { KeyList } from '../KeyManager/KeyList'
import { SessionHistory } from '../Session/SessionHistory'
import { Server, Key, History } from 'lucide-react'

type Page = 'hosts' | 'keys' | 'history'

export function AppShell() {
  const [page, setPage] = useState<Page>('hosts')

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="border-b border-gray-300 dark:border-gray-700 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold">GSS</h1>
          <nav className="flex gap-1">
            {([
              { id: 'hosts', label: '主机管理', icon: Server },
              { id: 'keys',  label: 'SSH 密钥', icon: Key },
              { id: 'history', label: '连接历史', icon: History },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setPage(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  page === id
                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </nav>
        </div>
        <AppMenu />
      </header>

      <main className="flex-1 overflow-auto">
        {page === 'hosts'   && <HostList />}
        {page === 'keys'    && <KeyList />}
        {page === 'history' && <SessionHistory />}
      </main>
    </div>
  )
}
