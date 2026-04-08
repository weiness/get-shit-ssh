import { X, Keyboard } from 'lucide-react'

const SHORTCUTS = [
  { keys: ['Ctrl', 'T'],           desc: '新建连接标签页' },
  { keys: ['Ctrl', 'W'],           desc: '关闭当前标签页' },
  { keys: ['Ctrl', 'Tab'],         desc: '切换到下一个标签页' },
  { keys: ['Ctrl', 'Shift', 'Tab'], desc: '切换到上一个标签页' },
  { keys: ['Ctrl', '`'],           desc: '展开 / 收起主机列表' },
]

interface ShortcutsModalProps {
  onClose: () => void
}

export function ShortcutsModal({ onClose }: ShortcutsModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-96 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Keyboard size={15} className="text-gray-400" />
            <h2 className="text-sm font-semibold">键盘快捷键</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          {SHORTCUTS.map(({ keys, desc }) => (
            <div key={desc} className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">{desc}</span>
              <div className="flex items-center gap-1">
                {keys.map((k, i) => (
                  <span
                    key={i}
                    className="px-1.5 py-0.5 text-[11px] font-mono bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 pb-4">
          <p className="text-[11px] text-gray-400 dark:text-gray-500">快捷键在终端聚焦时同样有效</p>
        </div>
      </div>
    </div>
  )
}
