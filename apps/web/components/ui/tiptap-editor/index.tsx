'use client'

import { EditorContent } from '@tiptap/react'
import { useTiptapEditor } from './hooks/useTiptapEditor'
import { useTiptapAutoFocus } from './hooks/useTiptapAutoFocus'
import { cn } from '@/lib/utils'

interface TiptapEditorProps {
  value: string // Markdown string
  onChange: (value: string) => void // Returns markdown string
  readOnly?: boolean
  placeholder?: string
  className?: string
  autoFocus?: boolean
}

export function TiptapEditor({
  value,
  onChange,
  readOnly = false,
  placeholder,
  className,
  autoFocus = false,
}: TiptapEditorProps) {
  const { editor, mounted } = useTiptapEditor({
    value,
    onChange,
    readOnly,
    placeholder,
  })

  useTiptapAutoFocus({
    editor,
    autoFocus,
    readOnly,
  })

  // Show loading state until mounted and editor is ready
  if (!mounted || !editor) {
    return (
      <div
        className={cn(
          'w-full h-96 rounded-md border border-input bg-white p-4 text-sm text-card-foreground shadow-sm',
          'flex items-center justify-center text-muted-foreground',
          className,
        )}
      >
        Loading editor...
      </div>
    )
  }

  if (readOnly) {
    return (
      <>
        <style>{`
          .tiptap p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left;
            color: hsl(var(--muted-foreground));
            pointer-events: none;
            height: 0;
          }
          .tiptap * {
            font-family: var(--font-sans) !important;
          }
        `}</style>
        <div
          className={cn(
            'w-full rounded-md border border-input bg-white p-4 text-sm text-card-foreground shadow-sm overflow-auto',
            className,
          )}
        >
          <EditorContent editor={editor} />
        </div>
      </>
    )
  }

  return (
    <>
      <style>{`
        .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          height: 0;
        }
        .tiptap * {
          font-family: var(--font-sans) !important;
        }
      `}</style>
      <div
        className={cn(
          'w-full rounded-md border border-input bg-white shadow-sm flex flex-col',
          className,
        )}
      >
        {/* Editor Content */}
        <div className="p-4 text-sm text-card-foreground overflow-auto flex-1 min-h-0">
          <EditorContent editor={editor} />
        </div>
      </div>
    </>
  )
}
