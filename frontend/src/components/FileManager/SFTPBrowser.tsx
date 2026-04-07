import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Folder, File, RefreshCw, Home, ChevronRight, Upload, Download, FolderPlus, Edit2, Trash2, MoreVertical, History } from 'lucide-react'
import * as App from '../../../wailsjs/go/main/App'
import { ssh } from '../../../wailsjs/go/models'
import { ToastContainer, Toast } from '../Toast'
import { useTransferStore } from '../../stores/transferStore'
import { TransferHistory } from './TransferHistory'

type FileEntry = ssh.FileInfo

interface SFTPBrowserProps {
  sessionID: string
  onClose: () => void
}

interface ContextMenu {
  x: number
  y: number
  entry: FileEntry | null  // null means empty area
}

export function SFTPBrowser({ sessionID, onClose }: SFTPBrowserProps) {
  const [sftpID, setSftpID] = useState<string | null>(null)
  const sftpIDRef = useRef<string | null>(null)
  const [currentPath, setCurrentPath] = useState('/')
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const { addRecord } = useTransferStore()

  const addToast = (type: Toast['type'], message: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    setToasts((prev) => [...prev, { id, type, message }])
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const listDir = useCallback(async (id: string, path: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await App.SFTPListDir(id, path)
      setEntries((result ?? []) as FileEntry[])
      setCurrentPath(path)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let id = ''
    App.SFTPOpen(sessionID)
      .then(async (opened) => {
        id = opened
        sftpIDRef.current = opened
        setSftpID(opened)
        const wd = await App.SFTPGetwd(opened)
        await listDir(opened, wd)
      })
      .catch((e) => setError(String(e)))
    return () => {
      if (id) App.SFTPClose(id).catch(console.error)
    }
  }, [sessionID, listDir])

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return
    const handler = () => setContextMenu(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [contextMenu])

  const refresh = () => { if (sftpID) listDir(sftpID, currentPath) }

  const navigate = (name: string, isDir: boolean) => {
    if (!isDir || !sftpID) return
    const next = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`
    listDir(sftpID, next)
  }

  const goUp = () => {
    if (!sftpID || currentPath === '/') return
    const parent = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/'
    listDir(sftpID, parent)
  }

  const goToPath = (path: string) => {
    if (sftpID) listDir(sftpID, path)
  }

  const handleUpload = async () => {
    if (!sftpID) return
    try {
      const localPath = await App.OpenFilePickerDialog('选择要上传的文件')
      if (!localPath) return
      const filename = localPath.replace(/\\/g, '/').split('/').pop() || 'file'
      const remotePath = currentPath === '/' ? `/${filename}` : `${currentPath}/${filename}`
      await App.SFTPUpload(sftpID, localPath, remotePath)
      addToast('success', `上传成功: ${filename}`)
      addRecord({ type: 'upload', filename, remotePath, localPath, status: 'success' })
      refresh()
    } catch (e) {
      const errorMsg = String(e)
      addToast('error', `上传失败: ${errorMsg}`)
      const filename = 'unknown'
      addRecord({ type: 'upload', filename, remotePath: currentPath, localPath: '', status: 'error', error: errorMsg })
    }
  }

  const handleDownload = async (entry: FileEntry) => {
    if (!sftpID) return
    try {
      const remotePath = currentPath === '/' ? `/${entry.name}` : `${currentPath}/${entry.name}`
      const localPath = await App.SaveFilePickerDialog('保存文件', entry.name)
      if (!localPath) return
      await App.SFTPDownload(sftpID, remotePath, localPath)
      addToast('success', `下载成功: ${entry.name}`)
      addRecord({ type: 'download', filename: entry.name, remotePath, localPath, status: 'success' })
    } catch (e) {
      const errorMsg = String(e)
      addToast('error', `下载失败: ${errorMsg}`)
      const remotePath = currentPath === '/' ? `/${entry.name}` : `${currentPath}/${entry.name}`
      addRecord({ type: 'download', filename: entry.name, remotePath, localPath: '', status: 'error', error: errorMsg })
    }
  }

  const handleMkdir = async () => {
    if (!sftpID) return
    const name = prompt('新建文件夹名称:')
    if (!name?.trim()) return
    try {
      const path = currentPath === '/' ? `/${name.trim()}` : `${currentPath}/${name.trim()}`
      await App.SFTPMkdir(sftpID, path)
      refresh()
    } catch (e) {
      alert('创建失败: ' + e)
    }
  }

  const handleRename = async (entry: FileEntry) => {
    if (!sftpID) return
    const newName = prompt('重命名为:', entry.name)
    if (!newName || newName === entry.name) return
    try {
      const oldPath = currentPath === '/' ? `/${entry.name}` : `${currentPath}/${entry.name}`
      const newPath = currentPath === '/' ? `/${newName}` : `${currentPath}/${newName}`
      await App.SFTPRename(sftpID, oldPath, newPath)
      refresh()
    } catch (e) {
      alert('重命名失败: ' + e)
    }
  }

  const handleDelete = async (entry: FileEntry) => {
    if (!sftpID) return
    if (!confirm(`确定删除 ${entry.name}?`)) return
    try {
      const path = currentPath === '/' ? `/${entry.name}` : `${currentPath}/${entry.name}`
      await App.SFTPDelete(sftpID, path)
      refresh()
    } catch (e) {
      alert('删除失败: ' + e)
    }
  }

  const handleContextMenu = (e: React.MouseEvent, entry: FileEntry | null) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, entry })
  }

  const handleEmptyAreaContextMenu = (e: React.MouseEvent) => {
    // Only trigger if clicking directly on the container, not on child elements
    if (e.target === e.currentTarget) {
      handleContextMenu(e, null)
    }
  }

  const sortedEntries = [...entries].sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  const pathSegments = currentPath.split('/').filter(Boolean)

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 select-none">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <Folder size={15} className="text-purple-500 shrink-0" />
        <span className="text-sm font-medium flex-1">SFTP 文件管理</span>
        <button onClick={handleUpload} title="上传文件"
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-blue-500 transition-colors">
          <Upload size={14} />
        </button>
        <button onClick={handleMkdir} title="新建文件夹"
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-blue-500 transition-colors">
          <FolderPlus size={14} />
        </button>
        <button onClick={() => setShowHistory(!showHistory)} title="传输记录"
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-blue-500 transition-colors">
          <History size={14} />
        </button>
        <button onClick={refresh} title="刷新"
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-blue-500 transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
        <button onClick={onClose} title="关闭"
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-200 dark:border-gray-700 text-xs shrink-0 overflow-x-auto whitespace-nowrap">
        <button onClick={() => goToPath('/')} title="根目录"
          className="hover:text-blue-500 transition-colors">
          <Home size={12} />
        </button>
        {pathSegments.map((seg, i) => {
          const path = '/' + pathSegments.slice(0, i + 1).join('/')
          return (
            <div key={i} className="flex items-center gap-1">
              <ChevronRight size={11} className="text-gray-400" />
              <button onClick={() => goToPath(path)} className="hover:text-blue-500 transition-colors">
                {seg}
              </button>
            </div>
          )
        })}
      </div>

      {/* File list */}
      <div
        className="flex-1 overflow-y-auto p-2"
        onContextMenu={handleEmptyAreaContextMenu}
      >
        {error && (
          <div className="p-3 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg">{error}</div>
        )}

        {!sftpID && !error && (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">正在连接...</div>
        )}

        {sftpID && !loading && !error && sortedEntries.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">空文件夹</div>
        )}

        {currentPath !== '/' && (
          <button onClick={goUp}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-left transition-colors">
            <Folder size={15} className="text-gray-400 shrink-0" />
            <span className="text-sm text-gray-500">..</span>
          </button>
        )}

        {sortedEntries.map((entry, i) => (
          <div
            key={i}
            onDoubleClick={() => navigate(entry.name, entry.isDir)}
            onContextMenu={(e) => handleContextMenu(e, entry)}
            className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-default transition-colors"
          >
            {entry.isDir
              ? <Folder size={15} className="text-blue-500 shrink-0" />
              : <File size={15} className="text-gray-400 shrink-0" />
            }
            <span className="flex-1 text-sm truncate">{entry.name}</span>
            {!entry.isDir && entry.size > 0 && (
              <span className="text-xs text-gray-400 shrink-0">
                {entry.size < 1024 ? `${entry.size}B`
                  : entry.size < 1048576 ? `${(entry.size / 1024).toFixed(1)}KB`
                  : `${(entry.size / 1048576).toFixed(1)}MB`}
              </span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); handleContextMenu(e, entry) }}
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-opacity text-gray-400"
            >
              <MoreVertical size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 9999 }}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 min-w-36"
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.entry ? (
            // File/folder specific menu
            <>
              {!contextMenu.entry.isDir && (
                <button
                  onClick={() => { handleDownload(contextMenu.entry!); setContextMenu(null) }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                >
                  <Download size={13} /> 下载
                </button>
              )}
              {contextMenu.entry.isDir && (
                <button
                  onClick={() => { navigate(contextMenu.entry!.name, true); setContextMenu(null) }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                >
                  <Folder size={13} /> 打开
                </button>
              )}
              <button
                onClick={() => { handleRename(contextMenu.entry!); setContextMenu(null) }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
              >
                <Edit2 size={13} /> 重命名
              </button>
              <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
              <button
                onClick={() => { handleUpload(); setContextMenu(null) }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
              >
                <Upload size={13} /> 上传文件
              </button>
              <button
                onClick={() => { handleMkdir(); setContextMenu(null) }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
              >
                <FolderPlus size={13} /> 新建文件夹
              </button>
              <button
                onClick={() => { refresh(); setContextMenu(null) }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
              >
                <RefreshCw size={13} /> 刷新
              </button>
              <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
              <button
                onClick={() => { handleDelete(contextMenu.entry!); setContextMenu(null) }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 text-left"
              >
                <Trash2 size={13} /> 删除
              </button>
            </>
          ) : (
            // Empty area menu
            <>
              <button
                onClick={() => { handleUpload(); setContextMenu(null) }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
              >
                <Upload size={13} /> 上传文件
              </button>
              <button
                onClick={() => { handleMkdir(); setContextMenu(null) }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
              >
                <FolderPlus size={13} /> 新建文件夹
              </button>
              <button
                onClick={() => { refresh(); setContextMenu(null) }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
              >
                <RefreshCw size={13} /> 刷新
              </button>
            </>
          )}
        </div>
      )}

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Transfer history panel */}
      {showHistory && (
        <div className="fixed inset-y-0 right-0 w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-2xl z-50">
          <TransferHistory onClose={() => setShowHistory(false)} />
        </div>
      )}
    </div>
  )
}
