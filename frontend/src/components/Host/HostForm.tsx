import { useState } from 'react'
import { Host } from '../../types/host'
import { X } from 'lucide-react'

interface HostFormProps {
  host?: Host
  onSubmit: (host: Host) => void
  onCancel: () => void
}

export function HostForm({ host, onSubmit, onCancel }: HostFormProps) {
  const [formData, setFormData] = useState<Host>(
    host || {
      id: Math.random().toString(36),
      name: '',
      host: '',
      port: 22,
      username: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ ...formData, updatedAt: Date.now() })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{host ? '编辑主机' : '添加主机'}</h2>
          <button onClick={onCancel} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">主机名</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">地址</label>
              <input
                type="text"
                value={formData.host}
                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                placeholder="192.168.1.1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">端口</label>
              <input
                type="number"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">用户名</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">密码 (可选)</label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
              placeholder="留空以使用密钥认证"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg transition-colors"
            >
              {host ? '更新' : '添加'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-700 text-gray-900 dark:text-white py-2 rounded-lg transition-colors"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
