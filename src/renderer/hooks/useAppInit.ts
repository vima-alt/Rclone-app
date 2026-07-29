import { useEffect } from 'react'
import { useAppStore } from '../stores/app.store'
import { useRemoteStore } from '../stores/remote.store'

export function useAppInit() {
  const loadSettings = useAppStore(s => s.loadSettings)
  const loaded = useAppStore(s => s.loaded)
  const loadRemotes = useRemoteStore(s => s.loadRemotes)

  useEffect(() => {
    if (!loaded) {
      loadSettings()
    }
  }, [loaded, loadSettings])

  useEffect(() => {
    if (loaded) {
      loadRemotes()
    }
  }, [loaded, loadRemotes])
}
