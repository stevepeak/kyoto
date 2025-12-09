import { Box, Text } from 'ink'
import Spinner from 'ink-spinner'
import React, { useCallback, useRef, useState } from 'react'

type SpinnerState = {
  id: number
  title: string
  progress: string
  state: 'running' | 'success' | 'fail'
}

export interface SpinnerHandle {
  progress: (text: string) => void
  succeed: (progressText?: string) => void
  fail: (progressText?: string) => void
  stop: () => void
}

interface CreateSpinnerOptions {
  title: string
  progress: string
}

interface UseSpinnerResult {
  activeSpinner: SpinnerState | null
  createSpinner: (options: CreateSpinnerOptions) => SpinnerHandle
  clearSpinner: () => void
  SpinnerDisplay: React.ComponentType
}

export function useSpinner(): UseSpinnerResult {
  const [activeSpinner, setActiveSpinner] = useState<SpinnerState | null>(null)
  const spinnerIdRef = useRef(0)

  const createSpinner = useCallback(
    (options: CreateSpinnerOptions): SpinnerHandle => {
      const id = spinnerIdRef.current++
      setActiveSpinner({
        id,
        title: options.title,
        progress: options.progress,
        state: 'running',
      })

      return {
        progress: (next: string) => {
          setActiveSpinner((prev) =>
            prev && prev.id === id ? { ...prev, progress: next } : prev,
          )
        },
        succeed: (progressText?: string) => {
          setActiveSpinner((prev) =>
            prev && prev.id === id
              ? {
                  ...prev,
                  progress: progressText ?? prev.progress,
                  state: 'success',
                }
              : prev,
          )
        },
        fail: (progressText?: string) => {
          setActiveSpinner((prev) =>
            prev && prev.id === id
              ? {
                  ...prev,
                  progress: progressText ?? prev.progress,
                  state: 'fail',
                }
              : prev,
          )
        },
        stop: () => {
          setActiveSpinner((prev) => (prev && prev.id === id ? null : prev))
        },
      }
    },
    [],
  )

  const clearSpinner = useCallback(() => {
    setActiveSpinner(null)
  }, [])

  const SpinnerDisplay = useCallback(() => {
    if (!activeSpinner) {
      return null
    }

    return (
      <Box marginTop={1} gap={1} flexDirection="row">
        {activeSpinner.state === 'running' ? (
          <Text color="red">
            <Spinner type="dots" />
          </Text>
        ) : (
          <Text color={activeSpinner.state === 'success' ? 'green' : 'red'}>
            •
          </Text>
        )}
        <Text>
          {activeSpinner.title}{' '}
          <Text color="grey">{activeSpinner.progress}</Text>
        </Text>
      </Box>
    )
  }, [activeSpinner])

  return {
    activeSpinner,
    createSpinner,
    clearSpinner,
    SpinnerDisplay,
  }
}
