import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface UseStoryKeyboardShortcutsProps {
  isSaving: boolean
  isCreateMode: boolean
  hasChanges: boolean
  orgName: string
  repoName: string
  handleSave: () => void | Promise<void>
}

export function useStoryKeyboardShortcuts({
  isSaving,
  isCreateMode,
  hasChanges,
  orgName,
  repoName,
  handleSave,
}: UseStoryKeyboardShortcutsProps) {
  const router = useRouter()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Cmd/Ctrl+Enter for save
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        // Prevent default to stop TipTap from inserting newline
        e.preventDefault()
        e.stopPropagation()
        if (!isSaving && (isCreateMode || hasChanges)) {
          void handleSave()
        }
        return
      }

      // Handle Escape key to navigate back to repo page
      if (e.key === 'Escape') {
        // Check if user is actively editing (input/textarea/contenteditable focused)
        const activeElement = document.activeElement
        const isEditing =
          activeElement &&
          (activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.hasAttribute('contenteditable') ||
            activeElement.closest('[contenteditable="true"]'))

        // Navigate if:
        // 1. In create mode (always allow Escape)
        // 2. In edit mode but not actively editing (editor not focused)
        // 3. In edit mode with no changes (existing behavior)
        if (isCreateMode || !isEditing || !hasChanges) {
          e.preventDefault()
          e.stopPropagation()
          // Use router.back() in create mode to avoid chunk loading issues
          // For edit mode, use router.push() to ensure we go to the repo page
          if (isCreateMode) {
            router.back()
          } else {
            router.push(`/org/${orgName}/repo/${repoName}`)
          }
        }
      }
    }

    // Use capture phase to catch the event before TipTap handles it
    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [
    isSaving,
    isCreateMode,
    hasChanges,
    orgName,
    repoName,
    router,
    handleSave,
  ])
}
