import { useState, useEffect } from 'react'
import { useHostStore } from '../../stores/hostStore'
import { useSessionStore } from '../../stores/sessionStore'
import { Host } from '../../types/host'
import { HostForm } from './HostForm'
import { HostItem } from './HostItem'
import { TerminalPane } from '../Terminal/TerminalPane'
import { SFTPBrowser } from '../FileManager/SFTPBrowser'
import { Plus } from 'lucide-react'

type PanelMode = 'terminal' | 'sftp' | null

export function HostList() {
  const { hosts, fetchHosts, removeHost } = useHostStore()
  const { connect, openTerminal } = useSessionStore()
  const [editingHost, setEditingHost] = useState<Host | undefined>()
  const [showForm, setShowForm] = useState(false)
  const [activeTerminal, setActiveTerminal] = useState<string | null>(null)
  const [activeSessionID, setActiveSessionID] = useState<string | null>(null)
  const [panelMode, setPanelMode] = useState<PanelMode>(null)
  const [connecting, setConnecting] = useState(false)

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

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingHost(undefined)
  }

  const handleConnect = async (hostID: string, hostName: string) => {
    setConnecting(true)
    try {
      const sessionID = await connect(hostID, hostName)
      const termID = await openTerminal(sessionID, 24, 80)
      setActiveTerminal(termID)
      setActiveSessionID(sessionID)
      setPanelMode('terminal')
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
      setActiveSessionID(sessionID)
      setPanelMode('sftp')
    } catch (error) {
      alert('连接失败: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setConnecting(false)
    }
  }

  const handleClosePanel = () => {
    setPanelMode(null)
    setActiveTerminal(null)
    setActiveSessionID(null)
  }

  return (
    <div className="flex h-full">
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

      {panelMode === 'terminal' && activeTerminal && (
        <div className="w-1/2 border-l border-gray-300 dark:border-gray-600">
          <TerminalPane termID={activeTerminal} onClose={handleClosePanel} />
        </div>
      )}

      {panelMode === 'sftp' && activeSessionID && (
        <div className="w-1/2 border-l border-gray-300 dark:border-gray-600">
          <SFTPBrowser sessionID={activeSessionID} onClose={handleClosePanel} />
        </div>
      )}

      {showForm && (
        <HostForm host={editingHost} onDone={handleFormDone} onCancel={handleFormCancel} />
      )}
    </div>
  )
}
