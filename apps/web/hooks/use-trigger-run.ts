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

  // Store callbacks in refs to avoid infinite loops from dependency changes
  const onCompleteRef = useRef(onComplete)
  const onErrorRef = useRef(onError)
  const onStreamTextRef = useRef(onStreamText)
  const toastMessagesRef = useRef(toastMessages)

  // Keep refs up to date
  useEffect(() => {
    onCompleteRef.current = onComplete
    onErrorRef.current = onError
    onStreamTextRef.current = onStreamText
    toastMessagesRef.current = toastMessages
  })

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
      const message = toastMessagesRef.current.onProgress?.('') ?? 'Loading...'
      toastIdRef.current = toast.loading(message)
    }
  }, [runId, isEnabled, showToast])

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
        onStreamTextRef.current?.(text)
      })

      // KEEP THIS LOG
      // eslint-disable-next-line no-console
      console.log('[useTriggerRun 🌊] streaming...', streamParts)

      if (showToast && toastIdRef.current) {
        const message = toastMessagesRef.current.onProgress
          ? toastMessagesRef.current.onProgress(fullText)
          : (streamParts[streamParts.length - 1] ?? 'Loading...')
        toast.loading(message, { id: toastIdRef.current })
      }
    }
  }, [streamParts, showToast])

  // Completion/error handling
  useEffect(() => {
    if (!run || run.id !== runId) {
      return
    }

    if (run.isCompleted) {
      if (showToast && toastIdRef.current) {
        const message =
          toastMessagesRef.current.onSuccess ?? 'Sync completed successfully'
        toast.success(message, { id: toastIdRef.current })
        toastIdRef.current = null
      }
      onCompleteRef.current?.(run.output as T)
    }

    if (run.isFailed || run.isCancelled) {
      const error = new Error('Workflow failed')
      if (showToast && toastIdRef.current) {
        const message = toastMessagesRef.current.onError
          ? toastMessagesRef.current.onError(error)
          : error.message
        toast.error(message, { id: toastIdRef.current })
        toastIdRef.current = null
      }
      onErrorRef.current?.(error)
    }
  }, [run, runId, showToast])

  // Handle runError
  useEffect(() => {
    if (!runError) {
      return
    }

    const error =
      runError instanceof Error ? runError : new Error(String(runError))

    if (showToast && toastIdRef.current) {
      const message = toastMessagesRef.current.onError
        ? toastMessagesRef.current.onError(error)
        : error.message
      toast.error(message, { id: toastIdRef.current })
      toastIdRef.current = null
    }
    onErrorRef.current?.(error)
  }, [runError, showToast])

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
