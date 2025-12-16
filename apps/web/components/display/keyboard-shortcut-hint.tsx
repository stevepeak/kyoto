import { useIsMac } from '@/hooks/use-is-mac'

/**
 * Component that displays keyboard shortcut hint (⌘ or Ctrl)
 * Safe for SSR - uses hook that prevents hydration mismatches
 */
export function KeyboardShortcutHint() {
  const isMac = useIsMac()
  return (
    <span className="ml-2 text-xs opacity-60">
      {isMac ? '⌘' : 'Ctrl'}+Enter
    </span>
  )
}
