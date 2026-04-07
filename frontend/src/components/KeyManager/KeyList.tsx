import { useEffect, useState } from 'react'
import { Key, Trash2, Copy, Check, Plus } from 'lucide-react'
import { useKeyStore, KeyInfo } from '../../stores/keyStore'
import { KeyForm } from './KeyForm'

export function KeyList() {
  const { keys, loading, fetchKeys, deleteKey } = useKeyStore()
  const [showForm, setShowForm] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  const handleCopy = async (key: KeyInfo) => {
    try {
      await navigator.clipboard.writeText(key.publicKey)
      setCopied(key.id)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // fallback: select text
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('删除此密钥? 此操作不可撤销。')) return
    try {
      await deleteKey(id)
    } catch (e) {
      alert('删除失败: ' + e)
    }
  }

  const keyType = (publicKey: string) => {
    if (publicKey.startsWith('ssh-ed25519')) return 'Ed25519'
    if (publicKey.startsWith('ecdsa-sha2-nistp256')) return 'ECDSA P-256'
    if (publicKey.startsWith('ssh-rsa')) return 'RSA'
    return '未知类型'
  }

  const fingerprint = (publicKey: string) => {
    // Show last 20 chars of the base64 part as a short identifier
    const parts = publicKey.trim().split(' ')
    if (parts.length >= 2) {
      const b64 = parts[1]
      return b64.slice(-20)
    }
    return '—'
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">SSH 密钥</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={18} />
          添加密钥
        </button>
      </div>

      {loading && (
        <div className="text-center py-8 text-gray-400">加载中...</div>
      )}

      {!loading && keys.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Key size={40} className="mx-auto mb-3 opacity-30" />
          <p>还没有添加任何 SSH 密钥</p>
          <p className="text-sm mt-1">点击「添加密钥」生成或导入密钥</p>
        </div>
      )}

      <div className="space-y-3">
        {keys.map((key) => (
          <div
            key={key.id}
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <Key size={20} className="text-blue-500 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{key.name}</span>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400">
                      {keyType(key.publicKey)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono truncate">
                    …{fingerprint(key.publicKey)}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    创建于 {new Date(key.createdAt * 1000).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => handleCopy(key)}
                  title="复制公钥"
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  {copied === key.id
                    ? <Check size={16} className="text-green-500" />
                    : <Copy size={16} className="text-gray-500" />
                  }
                </button>
                <button
                  onClick={() => handleDelete(key.id)}
                  title="删除密钥"
                  className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 size={16} className="text-red-500" />
                </button>
              </div>
            </div>

            {/* Public key preview */}
            <div className="mt-3 bg-gray-50 dark:bg-gray-900 rounded p-2 overflow-x-auto">
              <pre className="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap break-all font-mono">
                {key.publicKey.trim()}
              </pre>
            </div>
          </div>
        ))}
      </div>

      {showForm && <KeyForm onClose={() => setShowForm(false)} />}
    </div>
  )
}
