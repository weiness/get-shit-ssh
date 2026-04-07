import { useState } from 'react'
import { X, Key, Upload } from 'lucide-react'
import { useKeyStore } from '../../stores/keyStore'

interface KeyFormProps {
  onClose: () => void
}

type Mode = 'generate' | 'import'

export function KeyForm({ onClose }: KeyFormProps) {
  const { generateKey, importKey } = useKeyStore()
  const [mode, setMode] = useState<Mode>('generate')
  const [name, setName] = useState('')
  const [algorithm, setAlgorithm] = useState('ed25519')
  const [pemData, setPemData] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [generatedPub, setGeneratedPub] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!name.trim()) { setError('请输入密钥名称'); return }
    setSubmitting(true)
    setError(null)
    try {
      const { publicKey } = await generateKey(algorithm, name.trim())
      setGeneratedPub(publicKey)
    } catch (e) {
      setError(String(e))
    } finally {
      setSubmitting(false)
    }
  }

  const handleImport = async () => {
    if (!name.trim()) { setError('请输入密钥名称'); return }
    if (!pemData.trim()) { setError('请粘贴私钥 PEM 内容'); return }
    setSubmitting(true)
    setError(null)
    try {
      await importKey(pemData.trim(), name.trim())
      onClose()
    } catch (e) {
      setError(String(e))
    } finally {
      setSubmitting(false)
    }
  }

  const handleFileRead = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setPemData(ev.target?.result as string ?? '')
    reader.readAsText(file)
  }

  if (generatedPub) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold">密钥已生成</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              私钥已加密保存。以下是公钥内容，请复制并添加到目标服务器的
              <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">~/.ssh/authorized_keys</code> 文件中：
            </p>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 overflow-x-auto">
              <pre className="text-xs font-mono whitespace-pre-wrap break-all text-gray-700 dark:text-gray-300">
                {generatedPub.trim()}
              </pre>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(generatedPub.trim())}
              className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition-colors"
            >
              复制公钥
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">添加 SSH 密钥</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Mode tabs */}
          <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setMode('generate')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm transition-colors ${
                mode === 'generate'
                  ? 'bg-blue-500 text-white'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              <Key size={15} />
              生成新密钥
            </button>
            <button
              onClick={() => setMode('import')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm transition-colors ${
                mode === 'import'
                  ? 'bg-blue-500 text-white'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              <Upload size={15} />
              导入已有密钥
            </button>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1">密钥名称</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如: my-server-key"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {mode === 'generate' && (
            <div>
              <label className="block text-sm font-medium mb-1">算法</label>
              <select
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="ed25519">Ed25519（推荐）</option>
                <option value="ecdsa">ECDSA P-256</option>
              </select>
            </div>
          )}

          {mode === 'import' && (
            <div>
              <label className="block text-sm font-medium mb-1">私钥内容（PEM 格式）</label>
              <textarea
                value={pemData}
                onChange={(e) => setPemData(e.target.value)}
                placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;..."
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono resize-none"
              />
              <label className="mt-2 flex items-center gap-2 text-sm text-blue-500 hover:underline cursor-pointer">
                <Upload size={14} />
                从文件读取
                <input type="file" className="hidden" accept=".pem,.key,*" onChange={handleFileRead} />
              </label>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              取消
            </button>
            <button
              onClick={mode === 'generate' ? handleGenerate : handleImport}
              disabled={submitting}
              className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
            >
              {submitting ? '处理中...' : mode === 'generate' ? '生成密钥' : '导入密钥'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
