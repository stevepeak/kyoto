import { type ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface KanjiProps {
  title: string
  children: ReactNode
  className?: string
}

export function Kanji({ title, children, className }: KanjiProps) {
  return (
    <p
      className={cn(
        'text-sm font-semibold tracking-[0.3em] text-primary',
        className,
      )}
      title={title}
    >
      {children}
    </p>
  )
}
