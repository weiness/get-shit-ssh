import { useState, useEffect } from 'react'
import { useHostStore } from '../../stores/hostStore'
import { Host } from '../../types/host'
import { HostForm } from './HostForm'
import { HostItem } from './HostItem'
import { Plus } from 'lucide-react'

export function HostList() {
  const { hosts, fetchHosts, addHost, updateHost, removeHost } = useHostStore()
  const [editingHost, setEditingHost] = useState<Host | undefined>()
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetchHosts()
  }, [fetchHosts])

  const handleSubmit = async (host: Host) => {
    if (editingHost) {
      await updateHost(host)
      setEditingHost(undefined)
    } else {
      await addHost(host)
    }
    setShowForm(false)
  }

  const handleEdit = (host: Host) => {
    setEditingHost(host)
    setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingHost(undefined)
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">主机管理</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
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
            <HostItem key={host.id} host={host} onEdit={handleEdit} onDelete={removeHost} />
          ))
        )}
      </div>

      {showForm && (
        <HostForm host={editingHost} onSubmit={handleSubmit} onCancel={handleCancel} />
      )}
    </div>
  )
}
