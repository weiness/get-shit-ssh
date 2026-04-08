import { useState, useEffect, useRef } from 'react'
import { useHostStore } from '../../stores/hostStore'
import { useSessionStore } from '../../stores/sessionStore'
import { Host } from '../../types/host'
import { HostForm } from './HostForm'
import { HostItem } from './HostItem'
import { TerminalPane } from '../Terminal/TerminalPane'
import { TerminalTabBar, TermTab } from '../Terminal/TerminalTabBar'
import { QuickConnectPane } from '../Terminal/QuickConnectPane'
import { SFTPBrowser } from '../FileManager/SFTPBrowser'
import { Plus, Search, Server, X, PanelLeftOpen, PanelLeftClose } from 'lucide-react'

type RightPanel = { type: 'sftp'; sessionID: string } | null

export function HostList() {
  const { hosts, fetchHosts, removeHost } = useHostStore()
  const { connect, openTerminal, closeTerminal, disconnect } = useSessionStore()
  const [editingHost, setEditingHost] = useState<Host | undefined>()
  const [showForm, setShowForm] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [search, setSearch] = useState('')

  const [tabs, setTabs] = useState<TermTab[]>([])
  const [activeTermID, setActiveTermID] = useState<string | null>(null)
  const [sftpPanel, setSftpPanel] = useState<RightPanel>(null)

  // Host panel state: auto-hide when terminal opens
  const [hostPanelOpen, setHostPanelOpen] = useState(true)
  const panelRef = useRef<HTMLDivElement>(null)

  const hasSession = tabs.length > 0 || sftpPanel !== null

  useEffect(() => { fetchHosts() }, [fetchHosts])

  // Auto-hide host panel when first terminal opens
  useEffect(() => {
    if (hasSession) setHostPanelOpen(false)
    else setHostPanelOpen(true)
  }, [hasSession])

  // Close panel when clicking outside (only in terminal mode)
  useEffect(() => {
    if (!hasSession || !hostPanelOpen) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setHostPanelOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [hasSession, hostPanelOpen])

  const filtered = hosts.filter((h) =>
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    h.host.toLowerCase().includes(search.toLowerCase()) ||
    h.username.toLowerCase().includes(search.toLowerCase())
  )

  const handleEdit = (host: Host) => { setEditingHost(host); setShowForm(true) }
  const handleFormDone = () => { setShowForm(false); setEditingHost(undefined); fetchHosts() }

  const connectingRef = useRef(false)
  // homeTabID: if provided, replace that home tab with the new terminal tab
  const handleConnect = async (hostID: string, hostName: string, homeTabID?: string) => {
    if (connectingRef.current) return
    connectingRef.current = true
    setConnecting(true)
    try {
      const sessionID = await connect(hostID, hostName)
      const termID = await openTerminal(sessionID, 24, 80)
      const newTab: TermTab = { termID, sessionID, hostName }
      setTabs((prev) => {
        if (homeTabID) {
          return prev.map((t) => t.termID === homeTabID ? newTab : t)
        }
        return [...prev, newTab]
      })
      setActiveTermID(termID)
      setSftpPanel(null)
    } catch (error) {
      console.error('[HostList] Connection failed:', error)
      alert('连接失败: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setConnecting(false)
      connectingRef.current = false
    }
  }

  const handleFiles = async (hostID: string, hostName: string) => {
    setConnecting(true)
    try {
      const sessionID = await connect(hostID, hostName)
      setSftpPanel({ type: 'sftp', sessionID })
    } catch (error) {
      alert('连接失败: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setConnecting(false)
    }
  }

  const handleTabClose = async (termID: string, sessionID: string) => {
    // Home tabs have no real session
    if (sessionID) {
      await closeTerminal(termID)
      await disconnect(sessionID)
    }
    setTabs((prev) => {
      const next = prev.filter((t) => t.termID !== termID)
      if (activeTermID === termID) setActiveTermID(next.length > 0 ? next[next.length - 1].termID : null)
      return next
    })
  }

  const handleAddHomeTab = () => {
    const homeID = 'home-' + Date.now()
    setTabs((prev) => [...prev, { termID: homeID, sessionID: '', hostName: '新连接', isHome: true }])
    setActiveTermID(homeID)
    setSftpPanel(null)
  }

  // Host list panel content
  const HostPanel = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">主机</h2>
        <div className="flex items-center gap-1">
          {hasSession && (
            <button onClick={() => setHostPanelOpen(false)} title="收起"
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 transition-colors">
              <X size={14} />
            </button>
          )}
          <button
            onClick={() => { setEditingHost(undefined); setShowForm(true) }}
            disabled={connecting}
            title="添加主机"
            className="w-6 h-6 flex items-center justify-center bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-md transition-colors"
          >
            <Plus size={13} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pb-3 shrink-0">
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-100 dark:bg-gray-700/50 rounded-lg border border-transparent focus-within:border-blue-500/50">
          <Search size={12} className="text-gray-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索主机..."
            className="flex-1 bg-transparent text-xs outline-none text-gray-700 dark:text-gray-200 placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
            <Server size={32} className="opacity-20" />
            <p className="text-xs">{search ? '无匹配结果' : '还没有添加主机'}</p>
            {!search && (
              <button onClick={() => { setEditingHost(undefined); setShowForm(true) }}
                className="text-xs text-blue-500 hover:underline">添加第一台主机</button>
            )}
          </div>
        ) : (
          <div className="space-y-0.5">
            {filtered.map((host) => (
              <HostItem key={host.id} host={host}
                onEdit={handleEdit} onDelete={removeHost}
                onConnect={handleConnect} onFiles={handleFiles} />
            ))}
          </div>
        )}
      </div>
    </div>
  )

  // No terminal open: host list takes full area
  if (!hasSession) {
    return (
      <div className="h-full">
        {HostPanel}
        {showForm && (
          <HostForm host={editingHost} onDone={handleFormDone}
            onCancel={() => { setShowForm(false); setEditingHost(undefined) }} />
        )}
      </div>
    )
  }

  // Terminal open: terminal takes full area, host list is a floating overlay
  return (
    <div className="flex h-full relative overflow-hidden">
      {/* Floating host panel overlay */}
      {hostPanelOpen && (
        <div
          ref={panelRef}
          className="absolute left-0 top-0 bottom-0 z-20 w-72 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 shadow-xl flex flex-col"
        >
          {HostPanel}
        </div>
      )}

      {/* Terminal area — always full width */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Tab bar with toggle button */}
        <div className="flex items-center shrink-0 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          {/* Host panel toggle */}
          <button
            onClick={() => setHostPanelOpen((v) => !v)}
            title={hostPanelOpen ? '收起主机列表' : '展开主机列表'}
            className={`shrink-0 px-3 h-full flex items-center border-r border-gray-200 dark:border-gray-700 transition-colors ${
              hostPanelOpen
                ? 'text-blue-500 bg-blue-50 dark:bg-blue-500/10'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            {hostPanelOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
          </button>

          {sftpPanel ? (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
              <Server size={12} />
              <span>SFTP 文件管理</span>
              <button onClick={() => setSftpPanel(null)}
                className="ml-2 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-gray-600 transition-colors">
                <X size={11} />
              </button>
            </div>
          ) : (
            <>
              <TerminalTabBar
                tabs={tabs}
                activeTermID={activeTermID}
                onSelect={setActiveTermID}
                onClose={handleTabClose}
              />
              {/* + new tab button */}
              <button
                onClick={handleAddHomeTab}
                title="新建连接标签页"
                className="shrink-0 px-3 h-full flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800 border-l border-gray-200 dark:border-gray-700 transition-colors"
              >
                <Plus size={14} />
              </button>
              {/* spacer */}
              <div className="flex-1" />
            </>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 relative overflow-hidden">
          {sftpPanel ? (
            <SFTPBrowser sessionID={sftpPanel.sessionID} onClose={() => setSftpPanel(null)} />
          ) : (
            tabs.map((tab) => (
              <div key={tab.termID} className="absolute inset-0"
                style={{ display: tab.termID === activeTermID ? 'flex' : 'none', flexDirection: 'column' }}>
                {tab.isHome ? (
                  <QuickConnectPane
                    hosts={hosts}
                    connecting={connecting}
                    onConnect={(hostID, hostName) => handleConnect(hostID, hostName, tab.termID)}
                  />
                ) : (
                  <TerminalPane termID={tab.termID} visible={tab.termID === activeTermID} />
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {showForm && (
        <HostForm host={editingHost} onDone={handleFormDone}
          onCancel={() => { setShowForm(false); setEditingHost(undefined) }} />
      )}
    </div>
  )
}
