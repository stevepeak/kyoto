import { useEffect } from 'react'

export function useRepoKeyboardShortcuts(
  onOpenDialog: () => void,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault()
        onOpenDialog()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, onOpenDialog])
}
