import { useEditor } from '@tiptap/react'
import { useEffect, useMemo, useState } from 'react'

import { cn } from '@/lib/utils'

import { createEditorExtensions } from '../utils/editorExtensions'

interface UseTiptapEditorProps {
  value: string
  onChange: (value: string) => void
  readOnly: boolean
  placeholder?: string
}

export function useTiptapEditor({
  value,
  onChange,
  readOnly,
  placeholder,
}: UseTiptapEditorProps) {
  // Only render editor after hydration to prevent mismatches
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Client-side mounting pattern for Next.js
    setMounted(true)
  }, [])

  const extensions = useMemo(
    () => createEditorExtensions(readOnly, placeholder),
    [readOnly, placeholder],
  )

  const editor = useEditor({
    extensions,
    content: value || '',
    contentType: 'markdown',
    editable: !readOnly,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-none focus:outline-none min-h-[200px] font-sans',
          'prose-headings:font-semibold prose-headings:text-foreground prose-headings:font-sans',
          'prose-p:text-foreground prose-p:my-2 prose-p:font-sans',
          'prose-ul:text-foreground prose-ul:my-2 prose-ul:font-sans',
          'prose-ol:text-foreground prose-ol:my-2 prose-ol:font-sans',
          'prose-li:text-foreground prose-li:my-1 prose-li:font-sans',
          'prose-strong:text-foreground prose-strong:font-semibold prose-strong:font-sans',
          'prose-code:text-foreground prose-code:text-sm prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:font-sans',
          'prose-pre:text-foreground prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-md prose-pre:font-sans',
          'prose-blockquote:text-foreground prose-blockquote:border-l-4 prose-blockquote:border-muted-foreground prose-blockquote:pl-4 prose-blockquote:font-sans',
          'prose-a:text-primary prose-a:underline prose-a:font-sans',
        ),
      },
      handleKeyDown: (view, event) => {
        // Prevent Cmd+Enter or Ctrl+Enter from inserting a newline
        // Let the parent component handle the save action
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
          return true // Return true to prevent default behavior
        }
        return false // Let other keys work normally
      },
    },
    onUpdate: ({ editor }) => {
      // Save as markdown
      const markdown = editor.getMarkdown()
      onChange(markdown)
    },
  })

  // Update editor content when value prop changes (e.g., when loading from server)
  useEffect(() => {
    if (!editor) {
      return
    }

    const currentContent = editor.getMarkdown()

    // Only update if content actually changed
    if (value !== currentContent) {
      editor.commands.setContent(value || '', { contentType: 'markdown' })
    }
  }, [value, editor])

  // Update editable state when readOnly changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly)
    }
  }, [editor, readOnly])

  return { editor, mounted }
}
