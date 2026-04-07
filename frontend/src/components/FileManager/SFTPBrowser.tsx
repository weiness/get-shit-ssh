import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Folder, File, ArrowUp, RefreshCw, Trash2,
  Download, Upload, FolderPlus, Pencil, X, Loader2,
} from 'lucide-react'
import * as App from '../../../wailsjs/go/main/App'

interface SFTPBrowserProps {
  sessionID: string
  onClose: () => void
}

interface FileInfo {
  name: string
  path: string
  size: number
  mode: string
  isDir: boolean
  modTime: number
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleString()
}

function parentPath(p: string): string {
  const parts = p.replace(/\/+$/, '').split('/')
  if (parts.length <= 1) return '/'
  parts.pop()
  return parts.join('/') || '/'
}

export function SFTPBrowser({ sessionID, onClose }: SFTPBrowserProps) {
  const [sftpID, setSftpID] = useState<string | null>(null)
  const [currentPath, setCurrentPath] = useState('/')
  const [entries, setEntries] = useState<FileInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selected, setSelected] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [mkdirMode, setMkdirMode] = useState(false)
  const [mkdirValue, setMkdirValue] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sftpIDRef = useRef<string | null>(null)
  sftpIDRef.current = sftpID

  const listDir = useCallback(async (id: string, path: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await App.SFTPListDir(id, path)
      setEntries((result ?? []) as FileInfo[])
      setCurrentPath(path)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let opened = ''
    App.SFTPOpen(sessionID)
      .then(async (id) => {
        opened = id
        setSftpID(id)
        const wd = await App.SFTPGetwd(id)
        await listDir(id, wd)
      })
      .catch((e) => setError(String(e)))

    return () => {
      if (opened) App.SFTPClose(opened).catch(() => {})
    }
  }, [sessionID, listDir])

  const refresh = () => { if (sftpID) listDir(sftpID, currentPath) }

  const handleNavigate = (entry: FileInfo) => {
    if (entry.isDir && sftpID) {
      setSelected(null)
      listDir(sftpID, entry.path)
    }
  }

  const handleUp = () => {
    if (!sftpID) return
    const parent = parentPath(currentPath)
    if (parent !== currentPath) {
      setSelected(null)
      listDir(sftpID, parent)
    }
  }

  const handleDelete = async () => {
    if (!selected || !sftpID) return
    if (!confirm(`删除 ${selected}?`)) return
    try {
      await App.SFTPDelete(sftpID, selected)
      setSelected(null)
      await listDir(sftpID, currentPath)
    } catch (e) { alert('删除失败: ' + e) }
  }

  const handleRenameStart = () => {
    if (!selected) return
    setRenaming(selected)
    setRenameValue(selected.split('/').pop() ?? '')
  }

  const handleRenameConfirm = async () => {
    if (!renaming || !renameValue || !sftpID) return
    const dir = renaming.split('/').slice(0, -1).join('/')
    const newPath = (dir || '') + '/' + renameValue
    try {
      await App.SFTPRename(sftpID, renaming, newPath)
      setRenaming(null)
      setSelected(newPath)
      await listDir(sftpID, currentPath)
    } catch (e) { alert('重命名失败: ' + e) }
  }

  const handleMkdir = async () => {
    if (!mkdirValue.trim() || !sftpID) return
    const newDir = currentPath.replace(/\/+$/, '') + '/' + mkdirValue.trim()
    try {
      await App.SFTPMkdir(sftpID, newDir)
      setMkdirMode(false)
      setMkdirValue('')
      await listDir(sftpID, currentPath)
    } catch (e) { alert('创建目录失败: ' + e) }
  }

  const handleDownload = () => {
    if (!selected || !sftpID) return
    const filename = selected.split('/').pop() ?? 'file'
    App.SFTPDownload(sftpID, selected, filename).catch((e) => alert('下载失败: ' + e))
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !sftpID) return
    const remotePath = currentPath.replace(/\/+$/, '') + '/' + file.name
    try {
      await App.SFTPUpload(sftpID, (file as any).path ?? file.name, remotePath)
      await listDir(sftpID, currentPath)
    } catch (e) { alert('上传失败: ' + e) }
    e.target.value = ''
  }

  const breadcrumbs = currentPath.split('/').filter(Boolean)

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 text-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <span className="font-semibold text-gray-700 dark:text-gray-200">文件管理</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <X size={16} />
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-200 dark:border-gray-700">
        <button onClick={handleUp} disabled={!sftpID || currentPath === '/'} title="上级目录"
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40">
          <ArrowUp size={15} />
        </button>
        <button onClick={refresh} disabled={!sftpID || loading} title="刷新"
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
        <div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-1" />
        <button onClick={handleDownload} disabled={!selected} title="下载"
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40">
          <Download size={15} />
        </button>
        <button onClick={() => fileInputRef.current?.click()} disabled={!sftpID} title="上传"
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40">
          <Upload size={15} />
        </button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
        <button onClick={() => { setMkdirMode(true); setMkdirValue('') }} disabled={!sftpID} title="新建文件夹"
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40">
          <FolderPlus size={15} />
        </button>
        <div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-1" />
        <button onClick={handleRenameStart} disabled={!selected} title="重命名"
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40">
          <Pencil size={15} />
        </button>
        <button onClick={handleDelete} disabled={!selected} title="删除"
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 text-red-500">
          <Trash2 size={15} />
        </button>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 px-3 py-1 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 overflow-x-auto">
        <button onClick={() => sftpID && listDir(sftpID, '/')} className="hover:text-blue-500">/</button>
        {breadcrumbs.map((seg, i) => {
          const path = '/' + breadcrumbs.slice(0, i + 1).join('/')
          return (
            <span key={path} className="flex items-center gap-1">
              <span>/</span>
              <button onClick={() => sftpID && listDir(sftpID, path)} className="hover:text-blue-500 whitespace-nowrap">
                {seg}
              </button>
            </span>
          )
        })}
      </div>

      {/* Mkdir input */}
      {mkdirMode && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
          <FolderPlus size={14} className="text-blue-500 shrink-0" />
          <input
            autoFocus
            value={mkdirValue}
            onChange={(e) => setMkdirValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleMkdir(); if (e.key === 'Escape') setMkdirMode(false) }}
            placeholder="新目录名称"
            className="flex-1 bg-transparent border-b border-blue-400 outline-none text-sm px-1"
          />
          <button onClick={handleMkdir} className="text-blue-500 text-xs hover:underline">确定</button>
          <button onClick={() => setMkdirMode(false)} className="text-gray-400 text-xs hover:underline">取消</button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-3 py-1.5 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        {!sftpID ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <Loader2 size={20} className="animate-spin mr-2" />
            <span>正在连接...</span>
          </div>
        ) : entries.length === 0 && !loading ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-xs">空目录</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
              <tr className="text-gray-500 dark:text-gray-400">
                <th className="text-left px-3 py-1.5 font-medium">名称</th>
                <th className="text-right px-3 py-1.5 font-medium w-20">大小</th>
                <th className="text-left px-3 py-1.5 font-medium w-36 hidden md:table-cell">修改时间</th>
                <th className="text-left px-3 py-1.5 font-medium w-24 hidden lg:table-cell">权限</th>
              </tr>
            </thead>
            <tbody>
              {[...entries]
                .sort((a, b) => {
                  if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
                  return a.name.localeCompare(b.name)
                })
                .map((entry) => {
                  const isSelected = selected === entry.path
                  const isRenaming = renaming === entry.path
                  return (
                    <tr
                      key={entry.path}
                      onClick={() => setSelected(isSelected ? null : entry.path)}
                      onDoubleClick={() => handleNavigate(entry)}
                      className={`cursor-pointer border-b border-gray-100 dark:border-gray-800 select-none ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          {entry.isDir
                            ? <Folder size={14} className="text-yellow-500 shrink-0" />
                            : <File size={14} className="text-gray-400 shrink-0" />
                          }
                          {isRenaming ? (
                            <input
                              autoFocus
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameConfirm()
                                if (e.key === 'Escape') setRenaming(null)
                              }}
                              onBlur={handleRenameConfirm}
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 bg-white dark:bg-gray-700 border border-blue-400 rounded px-1 outline-none"
                            />
                          ) : (
                            <span className="truncate">{entry.name}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-right text-gray-500 dark:text-gray-400 tabular-nums">
                        {entry.isDir ? '—' : formatSize(entry.size)}
                      </td>
                      <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400 hidden md:table-cell whitespace-nowrap">
                        {formatDate(entry.modTime)}
                      </td>
                      <td className="px-3 py-1.5 text-gray-400 dark:text-gray-500 font-mono hidden lg:table-cell">
                        {entry.mode}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        )}
      </div>

      {/* Status bar */}
      <div className="px-3 py-1 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
        {entries.length} 个项目
        {selected && ` · 已选: ${selected.split('/').pop()}`}
      </div>
    </div>
  )
}
