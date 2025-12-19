import { useApp } from 'ink'
import { useEffect } from 'react'

/**
 * Hook that waits for initial render to complete before calling exit.
 * This ensures Ink has fully rendered before attempting to exit.
 *
 * @param delay - Delay in milliseconds before calling exit (default: 100ms)
 */
export function useExitAfterRender(delay = 100): void {
  const { exit } = useApp()

  useEffect(() => {
    // Wait for initial render to complete before exiting
    // Need to wait a tick to ensure Ink has fully rendered
    const timer = setTimeout(() => {
      exit()
    }, delay)
    return () => {
      clearTimeout(timer)
    }
  }, [exit, delay])
}
