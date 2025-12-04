import { useEffect } from 'react'
import type { Editor } from '@tiptap/react'

interface UseTiptapAutoFocusProps {
  editor: Editor | null
  autoFocus: boolean
  readOnly: boolean
}

export function useTiptapAutoFocus({
  editor,
  autoFocus,
  readOnly,
}: UseTiptapAutoFocusProps) {
  useEffect(() => {
    if (editor && autoFocus && !readOnly) {
      // Use setTimeout to ensure the editor is fully rendered
      const timeoutId = setTimeout(() => {
        editor.commands.focus()
      }, 100)
      return () => clearTimeout(timeoutId)
    }
  }, [editor, autoFocus, readOnly])
}
