'use client'

import { useIsMac } from '@/hooks/use-is-mac'

export function ReactGrabHint() {
  const isMac = useIsMac()
  const modifierKey = isMac ? '⌘' : 'Ctrl'

  return (
    <p className="text-sm text-muted-foreground">
      Hold{' '}
      <kbd className="rounded border bg-background px-1.5 py-0.5 text-xs font-mono">
        {modifierKey}+C
      </kbd>{' '}
      and click on any element to grab its visual context for Cursor or other AI
      coding assistants.
    </p>
  )
}
