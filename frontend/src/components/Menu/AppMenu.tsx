import { useState } from 'react'
import { useThemeStore } from '../../stores/themeStore'
import { Menu, Moon, Sun, HelpCircle } from 'lucide-react'

export function AppMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [showThemeMenu, setShowThemeMenu] = useState(false)
  const { theme, setTheme } = useThemeStore()

  return (
    <div className="relative">
      {/* Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
        aria-label="Menu"
      >
        <Menu size={24} />
      </button>

      {/* Main Menu Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg min-w-48 z-50">
          {/* Theme Menu Item */}
          <div className="relative">
            <button
              onMouseEnter={() => setShowThemeMenu(true)}
              onMouseLeave={() => setShowThemeMenu(false)}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
            >
              <span>主题</span>
              <span className="text-xs">➜</span>
            </button>

            {/* Theme Submenu */}
            {showThemeMenu && (
              <div className="absolute left-full top-0 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg min-w-40 ml-1">
                <button
                  onClick={() => {
                    setTheme('light')
                    setIsOpen(false)
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Sun size={18} />
                  <span>亮色</span>
                  {theme === 'light' && <span className="ml-auto">✓</span>}
                </button>
                <button
                  onClick={() => {
                    setTheme('dark')
                    setIsOpen(false)
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Moon size={18} />
                  <span>暗色</span>
                  {theme === 'dark' && <span className="ml-auto">✓</span>}
                </button>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-300 dark:border-gray-600" />

          {/* Help Item */}
          <button
            onClick={() => setIsOpen(false)}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <HelpCircle size={18} />
            <span>帮助</span>
          </button>
        </div>
      )}
    </div>
  )
}
