import { useEffect } from 'react'
import { AppShell } from './components/Layout/AppShell'
import { useThemeStore } from './stores/themeStore'

function App() {
  const { theme } = useThemeStore()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return <AppShell />
}

export default App
