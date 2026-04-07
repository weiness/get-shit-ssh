import { useEffect, useState } from 'react'
import { X, Lock, Key } from 'lucide-react'
import { Host } from '../../types/host'
import { useHostStore } from '../../stores/hostStore'
import { useKeyStore } from '../../stores/keyStore'

interface HostFormProps {
  host?: Host
  onDone: () => void
  onCancel: () => void
}

type AuthType = 'password' | 'key'

const emptyHost = (): Host => ({
  id: '',
  name: '',
  groupName: '',
  host: '',
  port: 22,
  username: '',
  authType: '',
  keyId: '',
  createdAt: 0,
  updatedAt: 0,
})

export function HostForm({ host, onDone, onCancel }: HostFormProps) {
  const { addHostWithPassword, addHostWithKey, updateHostWithPassword, updateHostWithKey } = useHostStore()
  const { keys, fetchKeys } = useKeyStore()

  const [form, setForm] = useState<Host>(host ?? emptyHost())
  const [authType, setAuthType] = useState<AuthType>(
    host?.authType === 'key' ? 'key' : 'password'
  )
  const [password, setPassword] = useState('')
  const [keyID, setKeyID] = useState(host?.keyId ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { fetchKeys() }, [fetchKeys])

  const set = (patch: Partial<Host>) => setForm((f) => ({ ...f, ...patch }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (authType === 'password' && !password && !host) {
      setError('请输入密码')
      return
    }
    if (authType === 'key' && !keyID) {
      setError('请选择 SSH 密钥')
      return
    }

    setSubmitting(true)
    try {
      const isEdit = Boolean(host?.id)
      if (authType === 'password') {
        // When editing and password left blank, keep existing auth unchanged
        if (isEdit && !password) {
          await updateHostWithPassword(form, '')
        } else if (isEdit) {
          await updateHostWithPassword(form, password)
        } else {
          await addHostWithPassword(form, password)
        }
      } else {
        if (isEdit) {
          await updateHostWithKey(form, keyID)
        } else {
          await addHostWithKey(form, keyID)
        }
      }
      onDone()
    } catch (e) {
      setError(String(e))
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-blue-500 text-sm'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">{host ? '编辑主机' : '添加主机'}</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1">显示名称</label>
            <input value={form.name} onChange={(e) => set({ name: e.target.value })}
              className={inputCls} placeholder="My Server" required />
          </div>

          {/* Host + Port */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">地址</label>
              <input value={form.host} onChange={(e) => set({ host: e.target.value })}
                className={inputCls} placeholder="192.168.1.1" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">端口</label>
              <input type="number" value={form.port}
                onChange={(e) => set({ port: parseInt(e.target.value) || 22 })}
                className={inputCls} required />
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium mb-1">用户名</label>
            <input value={form.username} onChange={(e) => set({ username: e.target.value })}
              className={inputCls} placeholder="root" required />
          </div>

          {/* Group */}
          <div>
            <label className="block text-sm font-medium mb-1">分组 <span className="text-gray-400 font-normal">(可选)</span></label>
            <input value={form.groupName} onChange={(e) => set({ groupName: e.target.value })}
              className={inputCls} placeholder="生产环境" />
          </div>

          {/* Auth type */}
          <div>
            <label className="block text-sm font-medium mb-2">认证方式</label>
            <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <button type="button" onClick={() => setAuthType('password')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm transition-colors ${
                  authType === 'password'
                    ? 'bg-blue-500 text-white'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                <Lock size={14} /> 密码
              </button>
              <button type="button" onClick={() => setAuthType('key')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm transition-colors ${
                  authType === 'key'
                    ? 'bg-blue-500 text-white'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                <Key size={14} /> SSH 密钥
              </button>
            </div>
          </div>

          {authType === 'password' ? (
            <div>
              <label className="block text-sm font-medium mb-1">
                密码{host && <span className="text-gray-400 font-normal ml-1">(留空保持不变)</span>}
              </label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className={inputCls} placeholder={host ? '••••••••' : '输入密码'} />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-1">选择密钥</label>
              {keys.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
                  暂无密钥。请先在「SSH 密钥」页面添加密钥。
                </p>
              ) : (
                <select value={keyID} onChange={(e) => setKeyID(e.target.value)}
                  className={inputCls} required={authType === 'key'}>
                  <option value="">-- 选择密钥 --</option>
                  {keys.map((k) => (
                    <option key={k.id} value={k.id}>{k.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCancel}
              className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              取消
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-sm transition-colors">
              {submitting ? '保存中...' : host ? '更新' : '添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
