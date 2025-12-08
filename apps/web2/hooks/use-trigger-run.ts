import { useRealtimeRun, useRealtimeStream } from '@trigger.dev/react-hooks'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

interface UseTriggerRunOptions<T = unknown> {
  runId: string | null
  publicAccessToken: string | null
  showToast?: boolean
  toastMessages?: {
    onProgress?: (streamText: string) => string
    onSuccess?: string
    onError?: (error: Error | string) => string
  }
  onComplete?: (output: T) => void
  onError?: (error: Error | string) => void
  onStreamText?: (text: string) => void
}

interface UseTriggerRunResult<T = unknown> {
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
  showToast = true,
  toastMessages = {},
  onComplete,
  onError,
  onStreamText,
}: UseTriggerRunOptions<T>): UseTriggerRunResult<T> {
  const isEnabled = Boolean(runId && publicAccessToken)

  const toastIdRef = useRef<string | number | null>(null)
  const streamTextRef = useRef<string>('')
  const lastRunIdRef = useRef<string | null>(null)

  const { run, error: runError } = useRealtimeRun(runId ?? '', {
    accessToken: publicAccessToken ?? undefined,
    enabled: isEnabled,
  })

  const needsStream = isEnabled && (onStreamText !== undefined || showToast)
  const { parts: streamParts } = useRealtimeStream<string>(
    runId ?? '',
    'progress',
    {
      accessToken: publicAccessToken ?? undefined,
      enabled: needsStream,
    },
  )

  // Reset when runId changes
  useEffect(() => {
    if (runId !== lastRunIdRef.current) {
      lastRunIdRef.current = runId
      streamTextRef.current = ''

      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current)
        toastIdRef.current = null
      }
    }
  }, [runId])

  // Toast management
  useEffect(() => {
    if (!showToast || !isEnabled) {
      return
    }

    if (!toastIdRef.current && runId) {
      const message = toastMessages.onProgress?.('') ?? 'Loading...'
      toastIdRef.current = toast.loading(message)
    }
  }, [runId, isEnabled, showToast, toastMessages])

  // Stream handling
  useEffect(() => {
    if (!streamParts?.length) {
      return
    }

    const fullText = streamParts.join('\n')
    const currentLines = streamTextRef.current.split('\n').filter(Boolean)
    const newParts = streamParts.slice(currentLines.length)

    if (newParts.length > 0) {
      streamTextRef.current = fullText
      newParts.forEach((text: string) => {
        onStreamText?.(text)
      })

      // KEEP THIS LOG
      // eslint-disable-next-line no-console
      console.log('[useTriggerRun 🌊] streaming...', streamParts)

      if (showToast && toastIdRef.current) {
        const message = toastMessages.onProgress
          ? toastMessages.onProgress(fullText)
          : (streamParts[streamParts.length - 1] ?? 'Loading...')
        toast.loading(message, { id: toastIdRef.current })
      }
    }
  }, [streamParts, onStreamText, showToast, toastMessages])

  // Completion/error handling
  useEffect(() => {
    if (!run || run.id !== runId) {
      return
    }

    if (run.isCompleted) {
      if (showToast && toastIdRef.current) {
        const message = toastMessages.onSuccess ?? 'Sync completed successfully'
        toast.success(message, { id: toastIdRef.current })
        toastIdRef.current = null
      }
      onComplete?.(run.output as T)
    }

    if (run.isFailed || run.isCancelled) {
      const error = new Error('Workflow failed')
      if (showToast && toastIdRef.current) {
        const message = toastMessages.onError
          ? toastMessages.onError(error)
          : error.message
        toast.error(message, { id: toastIdRef.current })
        toastIdRef.current = null
      }
      onError?.(error)
    }
  }, [run, runId, onComplete, onError, showToast, toastMessages])

  // Handle runError
  useEffect(() => {
    if (!runError) {
      return
    }

    const error =
      runError instanceof Error ? runError : new Error(String(runError))

    if (showToast && toastIdRef.current) {
      const message = toastMessages.onError
        ? toastMessages.onError(error)
        : error.message
      toast.error(message, { id: toastIdRef.current })
      toastIdRef.current = null
    }
    onError?.(error)
  }, [runError, onError, showToast, toastMessages])

  const isLoading =
    isEnabled &&
    runError === null &&
    (run == null || !['COMPLETED', 'FAILED', 'CRASHED'].includes(run.status))

  const isCompleted = run?.status === 'COMPLETED' || false
  const isFailed =
    (run?.status === 'FAILED' || run?.status === 'CRASHED') ?? false

  const output = run?.status === 'COMPLETED' ? (run.output as T) : null

  return {
    run,
    error: runError,
    isLoading,
    isCompleted,
    isFailed,
    output,
  }
}
