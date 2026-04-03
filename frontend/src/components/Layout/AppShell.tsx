import { AppMenu } from '../Menu/AppMenu'
import { HostList } from '../Host/HostList'

export function AppShell() {
  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-300 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">GSS</h1>
        <AppMenu />
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <HostList />
      </main>
    </div>
  )
}
