import { createContext, useContext, useEffect, useState } from 'react'

// Smart polling configuration
const SMART_POLLING_INTERVALS = {
  active: 15 * 1000, // 15 seconds when active
  inactive: 60 * 1000, // 1 minute when inactive
  background: 2 * 60 * 1000, // 2 minutes when in background
} as const

type PollingState = 'active' | 'inactive' | 'background'

interface SmartPollingContextValue {
  pollingState: PollingState
  refetchInterval: number
  isActive: boolean
}

export const SmartPollingContext =
  createContext<SmartPollingContextValue | null>(null)

/**
 * Hook to track user activity and determine polling state
 */
function useActivityState() {
  // Always start with safe defaults that match server-side rendering
  // This prevents hydration mismatches
  const [isVisible, setIsVisible] = useState(true)
  const [isFocused, setIsFocused] = useState(true)

  useEffect(() => {
    // Only update state after hydration on the client
    if (typeof window === 'undefined') {
      return
    }

    // Set initial values after mount to match actual browser state
    // This is necessary to fix hydration mismatches - state is updated after mount
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Required for hydration fix
    setIsVisible(!document.hidden)
    setIsFocused(document.hasFocus())

    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden)
    }

    const handleFocus = () => {
      setIsFocused(true)
    }

    const handleBlur = () => {
      setIsFocused(false)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

  return { isVisible, isFocused }
}

/**
 * Hook that provides smart polling context value
 */
export function useSmartPollingProvider(): SmartPollingContextValue {
  const { isVisible, isFocused } = useActivityState()

  const pollingState: PollingState = (() => {
    if (!isVisible) {
      return 'background'
    }
    if (isVisible && isFocused) {
      return 'active'
    }
    return 'inactive'
  })()

  const refetchInterval = SMART_POLLING_INTERVALS[pollingState]
  const isActive = pollingState === 'active'

  return {
    pollingState,
    refetchInterval,
    isActive,
  }
}

/**
 * Hook to access the global smart polling state
 */
export function useSmartPolling(): SmartPollingContextValue {
  const context = useContext(SmartPollingContext)

  if (!context) {
    // Fallback for when used outside provider
    console.warn(
      'useSmartPolling used outside SmartPollingProvider, using fallback values',
    )
    return {
      pollingState: 'inactive',
      refetchInterval: SMART_POLLING_INTERVALS.inactive,
      isActive: false,
    }
  }

  return context
}
