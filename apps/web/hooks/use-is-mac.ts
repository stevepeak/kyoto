import { useEffect, useState } from 'react'

/**
 * Hook to detect if the user is on a Mac platform.
 * Safe for SSR - starts with false and updates after hydration.
 */
export function useIsMac() {
  // Start with false (non-Mac) to match server-side rendering
  const [isMac, setIsMac] = useState(false)

  useEffect(() => {
    // Only check after hydration on the client
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return
    }

    // Check if platform is Mac
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Required for hydration fix
    setIsMac(navigator.platform.includes('Mac'))
  }, [])

  return isMac
}
