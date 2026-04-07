import { useState, useEffect } from 'react'
import { useHostStore } from '../../stores/hostStore'
import { useSessionStore } from '../../stores/sessionStore'
import { Host } from '../../types/host'
import { HostForm } from './HostForm'
import { HostItem } from './HostItem'
import { TerminalPane } from '../Terminal/TerminalPane'
import { TerminalTabBar, TermTab } from '../Terminal/TerminalTabBar'
import { SFTPBrowser } from '../FileManager/SFTPBrowser'
import { Plus } from 'lucide-react'

type RightPanel = { type: 'sftp'; sessionID: string } | null

export function HostList() {
  const { hosts, fetchHosts, removeHost } = useHostStore()
  const { connect, openTerminal, closeTerminal, disconnect } = useSessionStore()
  const [editingHost, setEditingHost] = useState<Host | undefined>()
  const [showForm, setShowForm] = useState(false)
  const [connecting, setConnecting] = useState(false)

  // Multi-tab terminal state
  const [tabs, setTabs] = useState<TermTab[]>([])
  const [activeTermID, setActiveTermID] = useState<string | null>(null)

  // SFTP panel (replaces all tabs when open)
  const [sftpPanel, setSftpPanel] = useState<RightPanel>(null)

  useEffect(() => { fetchHosts() }, [fetchHosts])

  const handleEdit = (host: Host) => {
    setEditingHost(host)
    setShowForm(true)
  }

  const handleFormDone = () => {
    setShowForm(false)
    setEditingHost(undefined)
    fetchHosts()
  }

  const handleConnect = async (hostID: string, hostName: string) => {
    setConnecting(true)
    try {
      const sessionID = await connect(hostID, hostName)
      const termID = await openTerminal(sessionID, 24, 80)
      const newTab: TermTab = { termID, sessionID, hostName }
      setTabs((prev) => [...prev, newTab])
      setActiveTermID(termID)
      setSftpPanel(null)
    } catch (error) {
      alert('连接失败: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setConnecting(false)
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
    await closeTerminal(termID)
    await disconnect(sessionID)
    setTabs((prev) => {
      const next = prev.filter((t) => t.termID !== termID)
      if (activeTermID === termID) {
        setActiveTermID(next.length > 0 ? next[next.length - 1].termID : null)
      }
      return next
    })
  }

  const handleSftpClose = () => setSftpPanel(null)

  const showRightPanel = tabs.length > 0 || sftpPanel !== null

  return (
    <div className="flex h-full">
      {/* Left: host list */}
      <div className="flex-1 overflow-y-auto p-6 min-w-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">主机管理</h1>
          <button
            onClick={() => { setEditingHost(undefined); setShowForm(true) }}
            disabled={connecting}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={20} />
            添加主机
          </button>
        </div>

        <div className="space-y-3">
          {hosts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>还没有添加任何主机</p>
            </div>
          ) : (
            hosts.map((host) => (
              <HostItem
                key={host.id}
                host={host}
                onEdit={handleEdit}
                onDelete={removeHost}
                onConnect={handleConnect}
                onFiles={handleFiles}
              />
            ))
          )}
        </div>
      </div>

      {/* Right: terminal tabs or SFTP */}
      {showRightPanel && (
        <div className="w-1/2 border-l border-gray-300 dark:border-gray-600 flex flex-col">
          {sftpPanel ? (
            <SFTPBrowser sessionID={sftpPanel.sessionID} onClose={handleSftpClose} />
          ) : (
            <>
              <TerminalTabBar
                tabs={tabs}
                activeTermID={activeTermID}
                onSelect={setActiveTermID}
                onClose={handleTabClose}
              />
              <div className="flex-1 relative overflow-hidden">
                {tabs.map((tab) => (
                  <div
                    key={tab.termID}
                    className="absolute inset-0"
                    style={{ display: tab.termID === activeTermID ? 'block' : 'none' }}
                  >
                    <TerminalPane termID={tab.termID} visible={tab.termID === activeTermID} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {showForm && (
        <HostForm host={editingHost} onDone={handleFormDone} onCancel={() => { setShowForm(false); setEditingHost(undefined) }} />
      )}
    </div>
  )
}
