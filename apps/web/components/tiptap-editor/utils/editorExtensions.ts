import type { Extensions } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import { Markdown } from '@tiptap/markdown'

export function createEditorExtensions(
  readOnly: boolean,
  placeholder?: string,
): Extensions {
  const baseExtensions: Extensions = [
    // Exclude Link from StarterKit since we're configuring our own
    StarterKit.configure({
      link: false,
    }),
    Markdown,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-primary underline',
      },
    }),
  ]

  // Only add placeholder extension when not read-only and placeholder is provided
  if (!readOnly && placeholder) {
    baseExtensions.push(
      Placeholder.configure({
        placeholder,
      }),
    )
  }

  return baseExtensions
}
