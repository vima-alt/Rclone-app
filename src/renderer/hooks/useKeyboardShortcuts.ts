import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../stores/app.store'

const NAV_ROUTES: Record<string, string> = {
  '1': '/',
  '2': '/remotes',
  '3': '/explorer',
  '4': '/transfers',
  '5': '/command-builder',
  '6': '/settings',
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate()
  const toggleSidebar = useAppStore(s => s.toggleSidebar)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return

      const key = e.key

      if (key >= '1' && key <= '6') {
        e.preventDefault()
        navigate(NAV_ROUTES[key])
        return
      }

      if (key === 'b') {
        e.preventDefault()
        toggleSidebar()
        return
      }

      if (key === ',') {
        e.preventDefault()
        navigate('/settings')
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate, toggleSidebar])
}
