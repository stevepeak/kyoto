'use client'

import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from 'tiptap-markdown'

export function Tiptap() {
  const editor = useEditor({
    extensions: [StarterKit, Markdown],
    content: '<p>Hello World! 🌎️</p>',
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose-base lg:prose-lg xl:prose-lg xl:prose-2xl p-4 m-5 min-w-[300px] min-h-[200px] focus:outline-none rounded-lg shadow-sm',
      },
    },
    // Don't render immediately on the server to avoid SSR issues
    immediatelyRender: false,
  })

  return <EditorContent editor={editor} />
}
