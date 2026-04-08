import { useEffect, useState } from 'react'
import { Key, Trash2, Copy, Check, Plus } from 'lucide-react'
import { useKeyStore, KeyInfo } from '../../stores/keyStore'
import { KeyForm } from './KeyForm'

export function KeyList() {
  const { keys, loading, fetchKeys, deleteKey } = useKeyStore()
  const [showForm, setShowForm] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => { fetchKeys() }, [fetchKeys])

  const handleCopy = async (key: KeyInfo) => {
    try {
      await navigator.clipboard.writeText(key.publicKey)
      setCopied(key.id)
      setTimeout(() => setCopied(null), 2000)
    } catch {}
  }

  const handleDelete = async (id: string) => {
    if (!confirm('删除此密钥? 此操作不可撤销。')) return
    try { await deleteKey(id) }
    catch (e) { alert('删除失败: ' + e) }
  }

  const keyType = (publicKey: string) => {
    if (publicKey.startsWith('ssh-ed25519')) return 'Ed25519'
    if (publicKey.startsWith('ecdsa-sha2-nistp256')) return 'ECDSA'
    if (publicKey.startsWith('ssh-rsa')) return 'RSA'
    return '未知'
  }

  const keyTypeColor = (publicKey: string) => {
    if (publicKey.startsWith('ssh-ed25519')) return 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
    if (publicKey.startsWith('ecdsa-sha2-nistp256')) return 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
    if (publicKey.startsWith('ssh-rsa')) return 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
    return 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
  }

  const fingerprint = (publicKey: string) => {
    const parts = publicKey.trim().split(' ')
    if (parts.length >= 2) return '…' + parts[1].slice(-24)
    return '—'
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-5 pb-3 shrink-0">
        <h2 className="text-base font-semibold">SSH 密钥</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus size={13} />
          添加密钥
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading && <div className="text-center py-8 text-gray-400 text-sm">加载中...</div>}

        {!loading && keys.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
            <Key size={36} className="opacity-20" />
            <p className="text-sm">还没有 SSH 密钥</p>
            <button onClick={() => setShowForm(true)} className="text-xs text-blue-500 hover:underline">
              生成第一个密钥
            </button>
          </div>
        )}

        <div className="space-y-2">
          {keys.map((key) => (
            <div
              key={key.id}
              className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Key size={15} className="text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{key.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${keyTypeColor(key.publicKey)}`}>
                        {keyType(key.publicKey)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-mono truncate">
                      {fingerprint(key.publicKey)}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {new Date(key.createdAt * 1000).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => handleCopy(key)} title="复制公钥"
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                    {copied === key.id
                      ? <Check size={14} className="text-green-500" />
                      : <Copy size={14} className="text-gray-400" />}
                  </button>
                  <button onClick={() => handleDelete(key.id)} title="删除密钥"
                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                    <Trash2 size={14} className="text-gray-400 hover:text-red-500" />
                  </button>
                </div>
              </div>

              <div className="mt-3 bg-gray-50 dark:bg-gray-900 rounded-lg p-2.5 overflow-x-auto">
                <pre className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-pre-wrap break-all font-mono leading-relaxed">
                  {key.publicKey.trim()}
                </pre>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showForm && <KeyForm onClose={() => setShowForm(false)} />}
    </div>
  )
}
