import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface UseRepoKeyboardShortcutsProps {
  orgName: string
  repoName: string
}

export function useRepoKeyboardShortcuts({
  orgName,
  repoName,
}: UseRepoKeyboardShortcutsProps) {
  const router = useRouter()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.includes('Mac')
      const modifierKey = isMac ? event.metaKey : event.ctrlKey

      if (modifierKey && event.key === 'Enter') {
        event.preventDefault()
        router.push(`/org/${orgName}/repo/${repoName}/stories/new`)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [orgName, repoName, router])
}
