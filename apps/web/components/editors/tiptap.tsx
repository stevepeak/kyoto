'use client'

import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect } from 'react'
import { Markdown } from 'tiptap-markdown'

import { cn } from '@/lib/utils'

interface TiptapProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  readOnly?: boolean
  className?: string
  autoFocus?: boolean
}

export function Tiptap({
  value = '',
  onChange,
  readOnly = false,
  className,
  autoFocus = false,
}: TiptapProps) {
  const editor = useEditor({
    extensions: [StarterKit, Markdown],
    content: value,
    editable: !readOnly,
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
          'prose-code:text-red-800 prose-code:text-sm prose-code:bg-muted prose-code:px-1.5 prose-code:py-1 prose-code:rounded prose-code:font-mono prose-code:font-normal prose-code:before:content-none prose-code:after:content-none',
          'prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-md prose-pre:font-sans',
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
      const markdown =
        // @ts-expect-error - tiptap-markdown extends storage with markdown property
        editor.storage.markdown?.getMarkdown?.() ?? editor.getText()
      onChange?.(markdown)
    },
    // Don't render immediately on the server to avoid SSR issues
    immediatelyRender: false,
  })

  // Update editor content when value prop changes
  useEffect(() => {
    if (!editor) {
      return
    }

    const currentContent =
      // @ts-expect-error - tiptap-markdown extends storage with markdown property
      editor.storage.markdown?.getMarkdown?.() ?? editor.getText()

    // Only update if content actually changed
    if (value !== currentContent) {
      editor.commands.setContent(value || '')
    }
  }, [value, editor])

  // Update editable state when readOnly changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly)
    }
  }, [editor, readOnly])

  // Auto focus
  useEffect(() => {
    if (editor && autoFocus && !readOnly) {
      editor.commands.focus('end')
    }
  }, [editor, autoFocus, readOnly])

  if (!editor) {
    return (
      <div
        className={cn(
          'w-full min-h-[200px] rounded-md border border-input bg-background p-4 text-sm',
          'flex items-center justify-center text-muted-foreground',
          className,
        )}
      >
        Loading editor...
      </div>
    )
  }

  return (
    <div
      className={cn(
        'w-full rounded-md border border-input bg-background p-4 text-sm overflow-auto',
        className,
      )}
    >
      <EditorContent editor={editor} />
    </div>
  )
}
