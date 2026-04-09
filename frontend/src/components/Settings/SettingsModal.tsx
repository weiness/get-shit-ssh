import { useState } from 'react'
import { X, Palette, Terminal, Wifi, Keyboard } from 'lucide-react'

export interface TerminalSettings {
  fontSize: number
  cursorStyle: 'block' | 'underline' | 'bar'
  scrollback: number
}

export interface ConnectionSettings {
  connectTimeoutMs: number
  keepaliveIntervalSec: number
}

export interface AppSettings {
  terminal: TerminalSettings
  connection: ConnectionSettings
}

interface SettingsModalProps {
  settings: AppSettings
  isMac: boolean
  onClose: () => void
  onChange: (settings: AppSettings) => void
}

type NavItem = '外观' | '终端' | '连接' | '快捷键'

const NAV_ITEMS: { label: NavItem; icon: typeof Palette }[] = [
  { label: '外观', icon: Palette },
  { label: '终端', icon: Terminal },
  { label: '连接', icon: Wifi },
  { label: '快捷键', icon: Keyboard },
]

export function SettingsModal({ settings, isMac, onClose, onChange }: SettingsModalProps) {
  const [active, setActive] = useState<NavItem>('外观')

  const setTerminal = (patch: Partial<TerminalSettings>) =>
    onChange({ ...settings, terminal: { ...settings.terminal, ...patch } })

  const setConnection = (patch: Partial<ConnectionSettings>) =>
    onChange({ ...settings, connection: { ...settings.connection, ...patch } })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl flex overflow-hidden w-[520px] h-[340px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left nav */}
        <div className="w-36 shrink-0 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col py-2">
          {NAV_ITEMS.map(({ label, icon: Icon }) => (
            <button
              key={label}
              onClick={() => setActive(label)}
              className={`flex items-center gap-2.5 px-4 py-2 text-sm transition-colors text-left ${
                active === label
                  ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Right panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{active}</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {active === '外观' && (
              <div className="space-y-4">
                <SettingRow label="字体大小" hint={`${isMac ? '⌘+/⌘−' : 'Ctrl+=/Ctrl+−'} 快捷键`}>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTerminal({ fontSize: Math.max(8, settings.terminal.fontSize - 1) })}
                      className="w-7 h-7 flex items-center justify-center rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm transition-colors"
                    >−</button>
                    <span className="w-12 text-center text-sm font-mono text-gray-700 dark:text-gray-200">{settings.terminal.fontSize}px</span>
                    <button
                      onClick={() => setTerminal({ fontSize: Math.min(24, settings.terminal.fontSize + 1) })}
                      className="w-7 h-7 flex items-center justify-center rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm transition-colors"
                    >+</button>
                  </div>
                  <input
                    type="range" min={8} max={24} value={settings.terminal.fontSize}
                    onChange={(e) => setTerminal({ fontSize: Number(e.target.value) })}
                    className="w-full mt-2 accent-blue-500"
                  />
                </SettingRow>
              </div>
            )}

            {active === '终端' && (
              <div className="space-y-4">
                <SettingRow label="光标样式">
                  <div className="flex gap-2">
                    {(['block', 'underline', 'bar'] as const).map((style) => (
                      <button
                        key={style}
                        onClick={() => setTerminal({ cursorStyle: style })}
                        className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                          settings.terminal.cursorStyle === style
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {style === 'block' ? '块状' : style === 'underline' ? '下划线' : '竖线'}
                      </button>
                    ))}
                  </div>
                </SettingRow>
                <SettingRow label="滚动行数" hint="终端历史缓冲区大小">
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min={100} max={50000} step={100}
                      value={settings.terminal.scrollback}
                      onChange={(e) => setTerminal({ scrollback: Math.max(100, Math.min(50000, Number(e.target.value))) })}
                      className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 outline-none focus:border-blue-500"
                    />
                    <span className="text-xs text-gray-400">行</span>
                  </div>
                </SettingRow>
              </div>
            )}

            {active === '快捷键' && (
              <div className="space-y-1">
                {[
                  { keys: isMac ? ['⌘', 'C'] : ['Ctrl', 'Shift', 'C'], desc: '复制' },
                  { keys: isMac ? ['⌘', 'V'] : ['Ctrl', 'Shift', 'V'], desc: '粘贴' },
                  { keys: ['Ctrl', 'T'],             desc: '新建连接标签页' },
                  { keys: ['Ctrl', 'W'],             desc: '关闭当前标签页' },
                  { keys: ['Ctrl', 'Tab'],           desc: '切换到下一个标签页' },
                  { keys: ['Ctrl', 'Shift', 'Tab'],  desc: '切换到上一个标签页' },
                  { keys: ['Ctrl', '`'],             desc: '展开 / 收起主机列表' },
                ].map(({ keys, desc }) => (
                  <div key={desc} className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{desc}</span>
                    <div className="flex items-center gap-1">
                      {keys.map((k, i) => (
                        <span key={i} className="px-1.5 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300">{k}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {active === '连接' && (
              <div className="space-y-4">
                <SettingRow label="连接超时" hint="超时后自动断开">
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min={5000} max={60000} step={1000}
                      value={settings.connection.connectTimeoutMs}
                      onChange={(e) => setConnection({ connectTimeoutMs: Math.max(5000, Math.min(60000, Number(e.target.value))) })}
                      className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 outline-none focus:border-blue-500"
                    />
                    <span className="text-xs text-gray-400">毫秒</span>
                  </div>
                </SettingRow>
                <SettingRow label="保活间隔" hint="0 表示禁用">
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min={0} max={300} step={5}
                      value={settings.connection.keepaliveIntervalSec}
                      onChange={(e) => setConnection({ keepaliveIntervalSec: Math.max(0, Math.min(300, Number(e.target.value))) })}
                      className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 outline-none focus:border-blue-500"
                    />
                    <span className="text-xs text-gray-400">秒</span>
                  </div>
                </SettingRow>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SettingRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1.5">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</span>
        {hint && <span className="text-xs text-gray-400">{hint}</span>}
      </div>
      {children}
    </div>
  )
}
