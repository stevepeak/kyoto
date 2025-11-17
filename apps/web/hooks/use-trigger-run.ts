import { useEffect, useRef } from 'react'
import { useRealtimeRun, useRealtimeStream } from '@trigger.dev/react-hooks'

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
  onStreamText?: (text: string) => void
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
 *   onStreamText: (text) => {
 *     console.log('Stream text:', text)
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
  onStreamText,
}: UseTriggerRunOptions<T>): UseTriggerRunResult<T> {
  const isEnabled =
    enabled &&
    runId !== null &&
    publicAccessToken !== null &&
    runId !== '' &&
    publicAccessToken !== ''

  const { run, error: runError } = useRealtimeRun(runId ?? '', {
    accessToken: publicAccessToken ?? undefined,
    enabled: isEnabled,
  })

  // Subscribe to stream if onStreamText is provided
  const streamEnabled = isEnabled && onStreamText !== undefined
  const { parts: streamParts } = useRealtimeStream<string>(
    runId ?? '',
    'progress',
    {
      accessToken: publicAccessToken ?? undefined,
      enabled: streamEnabled,
    },
  )

  // Track previously seen stream chunks
  const previousStreamLengthRef = useRef<number>(0)

  // Call onStreamText callback for new chunks
  useEffect(() => {
    if (
      streamParts &&
      onStreamText &&
      streamParts.length > previousStreamLengthRef.current
    ) {
      const newParts = streamParts.slice(previousStreamLengthRef.current)
      newParts.forEach((text) => {
        onStreamText(text)
      })
      previousStreamLengthRef.current = streamParts.length
    }
  }, [streamParts, onStreamText, runId])

  const previousStatusRef = useRef<string | null>(null)
  const previousErrorRef = useRef<unknown>(null)
  const hasCalledOnCompleteRef = useRef(false)

  // Reset completion tracking when runId changes
  useEffect(() => {
    if (runId === null) {
      hasCalledOnCompleteRef.current = false
      previousStatusRef.current = null
      previousErrorRef.current = null
      previousStreamLengthRef.current = 0
    } else if (runId !== '') {
      previousStreamLengthRef.current = 0
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

      onError?.(errorMessage)
    }
  }, [runError, onError, runId])

  // Handle completion
  useEffect(() => {
    if (
      run &&
      run.status === 'COMPLETED' &&
      run.status !== previousStatusRef.current &&
      !hasCalledOnCompleteRef.current
    ) {
      previousStatusRef.current = run.status
      hasCalledOnCompleteRef.current = true

      const output = run.output as T

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

      onError?.(errorMessage)
    }

    // Update previous status ref for any status change (after handling completion/failure)
    if (run && run.status !== previousStatusRef.current) {
      previousStatusRef.current = run.status
    }
  }, [run, onComplete, onError, runId])

  // isLoading should be true when:
  // 1. We have runId and token (enabled)
  // 2. Either run is null (still fetching) OR run exists but not in terminal state
  // 3. No error occurred
  const isLoading =
    isEnabled &&
    runError === null &&
    (run === null ||
      run === undefined ||
      (run.status !== 'COMPLETED' &&
        run.status !== 'FAILED' &&
        run.status !== 'CRASHED'))

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
