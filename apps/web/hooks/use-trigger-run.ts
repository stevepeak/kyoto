import { useEffect, useRef } from 'react'
import { useRealtimeRun } from '@trigger.dev/react-hooks'

export interface TriggerHandle {
  id: string
  publicAccessToken: string
}

export interface UseTriggerRunOptions<T = unknown> {
  runId: string | null
  publicAccessToken: string | null
  enabled?: boolean
  onComplete?: (output: T) => void
  onError?: (error: Error | string) => void
}

export interface UseTriggerRunResult<T = unknown> {
  run: ReturnType<typeof useRealtimeRun>['run']
  error: ReturnType<typeof useRealtimeRun>['error']
  isLoading: boolean
  isCompleted: boolean
  isFailed: boolean
  output: T | null
}

/**
 * Reusable hook for waiting on a Trigger.dev run to complete.
 *
 * @example
 * ```tsx
 * const { output, isLoading, isCompleted, error } = useTriggerRun({
 *   runId: triggerHandle?.id ?? null,
 *   publicAccessToken: triggerHandle?.publicAccessToken ?? null,
 *   onComplete: (result) => {
 *     console.log('Run completed:', result)
 *   },
 *   onError: (err) => {
 *     console.error('Run failed:', err)
 *   },
 * })
 * ```
 */
export function useTriggerRun<T = unknown>({
  runId,
  publicAccessToken,
  enabled = true,
  onComplete,
  onError,
}: UseTriggerRunOptions<T>): UseTriggerRunResult<T> {
  const { run, error: runError } = useRealtimeRun(runId ?? '', {
    accessToken: publicAccessToken ?? undefined,
    enabled:
      enabled &&
      runId !== null &&
      publicAccessToken !== null &&
      runId !== '' &&
      publicAccessToken !== '',
  })

  const previousStatusRef = useRef<string | null>(null)
  const previousErrorRef = useRef<unknown>(null)
  const hasCalledOnCompleteRef = useRef(false)

  // Reset completion tracking when runId changes
  useEffect(() => {
    if (runId === null) {
      hasCalledOnCompleteRef.current = false
      previousStatusRef.current = null
      previousErrorRef.current = null
      console.debug('[useTriggerRun] Run reset - runId is null')
    } else if (runId !== '') {
      console.debug('[useTriggerRun] Run started', { runId })
    }
  }, [runId])

  // Handle errors
  useEffect(() => {
    if (runError && runError !== previousErrorRef.current) {
      previousErrorRef.current = runError
      let errorMessage: Error | string
      if (runError instanceof Error) {
        errorMessage = runError
      } else {
        const errorObj = runError as { message?: unknown }
        const message =
          errorObj && typeof errorObj === 'object' && 'message' in errorObj
            ? String(errorObj.message)
            : 'Trigger run failed'
        errorMessage = new Error(message)
      }
      console.debug('[useTriggerRun] Error occurred', {
        runId,
        error: errorMessage,
        originalError: runError,
      })
      onError?.(errorMessage)
    }
  }, [runError, onError, runId])

  // Handle completion
  useEffect(() => {
    // Log status changes
    if (run && run.status !== previousStatusRef.current) {
      console.debug('[useTriggerRun] Status update', {
        runId,
        previousStatus: previousStatusRef.current,
        newStatus: run.status,
        output: run.output,
      })
    }

    if (
      run &&
      run.status === 'COMPLETED' &&
      run.status !== previousStatusRef.current &&
      !hasCalledOnCompleteRef.current
    ) {
      previousStatusRef.current = run.status
      hasCalledOnCompleteRef.current = true

      const output = run.output as T
      console.debug('[useTriggerRun] Run completed', {
        runId,
        output,
      })
      onComplete?.(output)
    }

    // Handle failed/crashed states
    if (
      run &&
      (run.status === 'FAILED' || run.status === 'CRASHED') &&
      run.status !== previousStatusRef.current
    ) {
      previousStatusRef.current = run.status
      const errorMessage = new Error(
        run.status === 'FAILED' ? 'Trigger run failed' : 'Trigger run crashed',
      )
      console.debug('[useTriggerRun] Run finished with error', {
        runId,
        status: run.status,
        error: errorMessage,
      })
      onError?.(errorMessage)
    }

    // Update previous status ref for any status change (after handling completion/failure)
    if (run && run.status !== previousStatusRef.current) {
      previousStatusRef.current = run.status
    }
  }, [run, onComplete, onError, runId])

  const isLoading =
    runId !== null &&
    publicAccessToken !== null &&
    run !== null &&
    run !== undefined &&
    run.status !== 'COMPLETED' &&
    run.status !== 'FAILED' &&
    run.status !== 'CRASHED' &&
    runError === null

  const isCompleted = run?.status === 'COMPLETED' || false
  const isFailed =
    run?.status === 'FAILED' || run?.status === 'CRASHED' || false

  const output =
    (run?.status === 'COMPLETED' ? (run.output as T) : null) ?? null

  return {
    run,
    error: runError,
    isLoading,
    isCompleted,
    isFailed,
    output,
  }
}
