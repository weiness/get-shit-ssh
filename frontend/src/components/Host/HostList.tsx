import { useState, useEffect, useRef, useCallback } from 'react'
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

const CONNECT_TIMEOUT_MS = 15000

function connectWithTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('连接超时（15秒），请检查网络或主机地址')), CONNECT_TIMEOUT_MS)
    ),
  ])
}

export function HostList() {
  const { hosts, fetchHosts, removeHost } = useHostStore()
  const { connect, openTerminal, closeTerminal, disconnect } = useSessionStore()
  const [editingHost, setEditingHost] = useState<Host | undefined>()
  const [showForm, setShowForm] = useState(false)
  const [connectingHosts, setConnectingHosts] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  const [tabs, setTabs] = useState<TermTab[]>([])
  const [activeTermID, setActiveTermID] = useState<string | null>(null)
  const [sftpPanel, setSftpPanel] = useState<RightPanel>(null)

  const [hostPanelOpen, setHostPanelOpen] = useState(true)
  const panelRef = useRef<HTMLDivElement>(null)

  const hasSession = tabs.length > 0 || sftpPanel !== null

  useEffect(() => { fetchHosts() }, [fetchHosts])

  useEffect(() => {
    if (hasSession) setHostPanelOpen(false)
    else setHostPanelOpen(true)
  }, [hasSession])

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

  const addConnecting = (id: string) => setConnectingHosts((s) => new Set(s).add(id))
  const removeConnecting = (id: string) => setConnectingHosts((s) => { const n = new Set(s); n.delete(id); return n })

  const handleConnect = useCallback(async (hostID: string, hostName: string, replaceTabID?: string) => {
    if (connectingHosts.has(hostID)) return
    addConnecting(hostID)
    try {
      const sessionID = await connectWithTimeout(connect(hostID, hostName))
      const termID = await openTerminal(sessionID, 24, 80)
      const newTab: TermTab = { termID, sessionID, hostID, hostName, status: 'connected' }
      setTabs((prev) => {
        if (replaceTabID) return prev.map((t) => t.termID === replaceTabID ? newTab : t)
        return [...prev, newTab]
      })
      setActiveTermID(termID)
      setSftpPanel(null)
    } catch (error) {
      alert('连接失败: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      removeConnecting(hostID)
    }
  }, [connect, openTerminal, connectingHosts])

  const handleReconnect = useCallback(async (tab: TermTab) => {
    if (connectingHosts.has(tab.hostID)) return
    addConnecting(tab.hostID)
    setTabs((prev) => prev.map((t) => t.termID === tab.termID ? { ...t, status: undefined } : t))
    try {
      const sessionID = await connectWithTimeout(connect(tab.hostID, tab.hostName))
      const termID = await openTerminal(sessionID, 24, 80)
      const newTab: TermTab = { termID, sessionID, hostID: tab.hostID, hostName: tab.hostName, status: 'connected' }
      setTabs((prev) => prev.map((t) => t.termID === tab.termID ? newTab : t))
      setActiveTermID(termID)
    } catch (error) {
      setTabs((prev) => prev.map((t) => t.termID === tab.termID ? { ...t, status: 'disconnected' } : t))
      alert('重连失败: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      removeConnecting(tab.hostID)
    }
  }, [connect, openTerminal, connectingHosts])

  const handleTabDisconnected = useCallback((termID: string) => {
    setTabs((prev) => prev.map((t) => t.termID === termID ? { ...t, status: 'disconnected' } : t))
  }, [])

  const handleFiles = async (hostID: string, hostName: string) => {
    if (connectingHosts.has(hostID)) return
    addConnecting(hostID)
    try {
      const sessionID = await connectWithTimeout(connect(hostID, hostName))
      setSftpPanel({ type: 'sftp', sessionID })
    } catch (error) {
      alert('连接失败: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      removeConnecting(hostID)
    }
  }

  const handleTabClose = useCallback(async (termID: string, sessionID: string) => {
    if (sessionID) {
      await closeTerminal(termID)
      await disconnect(sessionID)
    }
    setTabs((prev) => {
      const next = prev.filter((t) => t.termID !== termID)
      if (activeTermID === termID) setActiveTermID(next.length > 0 ? next[next.length - 1].termID : null)
      return next
      // When next is empty, hasSession becomes false → auto-shows host list
    })
  }, [closeTerminal, disconnect, activeTermID])

  const handleAddHomeTab = useCallback(() => {
    const homeID = 'home-' + Date.now()
    setTabs((prev) => [...prev, { termID: homeID, sessionID: '', hostID: '', hostName: '新连接', isHome: true }])
    setActiveTermID(homeID)
    setSftpPanel(null)
  }, [])

  // Keyboard shortcuts — stable handler via ref
  const stateRef = useRef({ tabs, activeTermID, hostPanelOpen })
  useEffect(() => { stateRef.current = { tabs, activeTermID, hostPanelOpen } })

  const shortcutHandler = useCallback((e: KeyboardEvent): boolean => {
    if (!e.ctrlKey) return true
    const { tabs, activeTermID, hostPanelOpen } = stateRef.current

    if (e.key === 't') {
      e.preventDefault()
      handleAddHomeTab()
      return false
    }
    if (e.key === 'w') {
      e.preventDefault()
      if (activeTermID) {
        const tab = tabs.find((t) => t.termID === activeTermID)
        if (tab) handleTabClose(tab.termID, tab.sessionID)
      }
      return false
    }
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault()
      if (tabs.length > 1 && activeTermID) {
        const idx = tabs.findIndex((t) => t.termID === activeTermID)
        setActiveTermID(tabs[(idx + 1) % tabs.length].termID)
      }
      return false
    }
    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault()
      if (tabs.length > 1 && activeTermID) {
        const idx = tabs.findIndex((t) => t.termID === activeTermID)
        setActiveTermID(tabs[(idx - 1 + tabs.length) % tabs.length].termID)
      }
      return false
    }
    if (e.key === '`') {
      e.preventDefault()
      setHostPanelOpen(!hostPanelOpen)
      return false
    }
    return true
  }, [handleAddHomeTab, handleTabClose])

  // Document-level shortcuts (when terminal is not focused)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      shortcutHandler(e)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [shortcutHandler])

  // Host list panel content
  const HostPanel = (
    <div className="flex flex-col h-full overflow-hidden">
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
                onConnect={handleConnect} onFiles={handleFiles}
                connecting={connectingHosts.has(host.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )

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

  return (
    <div className="flex h-full relative overflow-hidden">
      {hostPanelOpen && (
        <div
          ref={panelRef}
          className="absolute left-0 top-0 bottom-0 z-20 w-72 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 shadow-xl flex flex-col"
        >
          {HostPanel}
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div className="flex items-center shrink-0 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setHostPanelOpen((v) => !v)}
            title={hostPanelOpen ? '收起主机列表 (Ctrl+`)' : '展开主机列表 (Ctrl+`)'}
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
              <button
                onClick={handleAddHomeTab}
                title="新建连接标签页 (Ctrl+T)"
                className="shrink-0 px-3 h-full flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800 border-l border-gray-200 dark:border-gray-700 transition-colors"
              >
                <Plus size={14} />
              </button>
              <div className="flex-1" />
            </>
          )}
        </div>

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
                    connectingHosts={connectingHosts}
                    onConnect={(hostID, hostName) => handleConnect(hostID, hostName, tab.termID)}
                  />
                ) : (
                  <TerminalPane
                    termID={tab.termID}
                    visible={tab.termID === activeTermID}
                    disconnected={tab.status === 'disconnected'}
                    onReconnect={() => handleReconnect(tab)}
                    onKeyboardShortcut={shortcutHandler}
                    onDisconnected={() => handleTabDisconnected(tab.termID)}
                  />
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
