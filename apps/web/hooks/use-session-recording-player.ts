'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import 'rrweb-player/dist/style.css'

import { useTRPC } from '@/lib/trpc-client'

type UseSessionRecordingPlayerArgs = {
  runId: string
  isRunning?: boolean
}

export function useSessionRecordingPlayer({
  runId,
  isRunning = false,
}: UseSessionRecordingPlayerArgs) {
  const trpc = useTRPC()
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<unknown>(null)
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const wasRunningRef = useRef(isRunning)

  const recordingQuery = trpc.browserAgents.getRecording.useQuery(
    { runId },
    { enabled: !!runId },
  )

  // Refetch recording when run completes (transitions from running to not running)
  useEffect(() => {
    if (wasRunningRef.current && !isRunning) {
      void recordingQuery.refetch()
    }
    wasRunningRef.current = isRunning
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning])

  const updatePlayerSize = useCallback(() => {
    if (!containerRef.current || !playerRef.current) return

    // Get the actual container width (or parent if container is hidden)
    let containerWidth = containerRef.current.clientWidth
    if (!containerWidth || containerWidth === 0) {
      const parent = containerRef.current.parentElement
      containerWidth = parent?.clientWidth || 800
    }

    const aspectRatio = 16 / 9
    const width = Math.max(containerWidth, 320)
    const height = Math.round(width / aspectRatio)

    // Try to update player size via API
    const player = playerRef.current as {
      $set?: (props: { width: number; height: number }) => void
      $destroy?: () => void
    }

    // If $set method exists (Svelte component), use it
    if (player.$set) {
      player.$set({ width, height })
    } else {
      // Fallback: Update the player element's style directly
      // The rrweb-player creates a root element that we can style
      const playerElement = containerRef.current.querySelector(
        '[data-rrweb-player]',
      ) as HTMLElement
      if (playerElement) {
        playerElement.style.width = `${width}px`
        playerElement.style.height = `${height}px`
        playerElement.style.maxWidth = '100%'
      }
    }
  }, [])

  const initPlayer = useCallback(async () => {
    if (
      !containerRef.current ||
      recordingQuery.data?.type !== 'browser' ||
      !recordingQuery.data.events ||
      playerRef.current
    ) {
      return
    }

    // Dynamic import to avoid SSR issues
    const rrwebPlayer = await import('rrweb-player')

    // Clear container
    containerRef.current.innerHTML = ''

    // Get container width - use parent if container is hidden
    let containerWidth = containerRef.current.clientWidth
    if (!containerWidth || containerWidth === 0) {
      const parent = containerRef.current.parentElement
      containerWidth = parent?.clientWidth || 800
    }
    const aspectRatio = 16 / 9
    const width = Math.max(containerWidth, 320)
    const height = Math.round(width / aspectRatio)

    playerRef.current = new rrwebPlayer.default({
      target: containerRef.current,
      props: {
        events: recordingQuery.data.events,
        width,
        height,
        autoPlay: false,
        showController: true,
        speedOption: [1, 0.5, 2, 4],
      },
    })

    setIsPlayerReady(true)

    // Set up ResizeObserver to update player size when container resizes
    // Use a small debounce to avoid too many updates
    let resizeTimeout: NodeJS.Timeout | null = null
    const resizeObserver = new ResizeObserver(() => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout)
      }
      resizeTimeout = setTimeout(() => {
        updatePlayerSize()
      }, 100)
    })

    // Observe the container and its parent for size changes
    resizeObserver.observe(containerRef.current)
    if (containerRef.current.parentElement) {
      resizeObserver.observe(containerRef.current.parentElement)
    }

    // Store observer and timeout for cleanup
    ;(
      playerRef.current as {
        _resizeObserver?: ResizeObserver
        _resizeTimeout?: NodeJS.Timeout | null
      }
    )._resizeObserver = resizeObserver
    ;(
      playerRef.current as {
        _resizeObserver?: ResizeObserver
        _resizeTimeout?: NodeJS.Timeout | null
      }
    )._resizeTimeout = resizeTimeout
  }, [recordingQuery.data, updatePlayerSize])

  useEffect(() => {
    void initPlayer()

    return () => {
      if (playerRef.current) {
        // Clean up ResizeObserver and timeout if they exist
        const player = playerRef.current as {
          _resizeObserver?: ResizeObserver
          _resizeTimeout?: NodeJS.Timeout | null
        }
        if (player._resizeObserver) {
          player._resizeObserver.disconnect()
        }
        if (player._resizeTimeout) {
          clearTimeout(player._resizeTimeout)
        }
        playerRef.current = null
      }
    }
  }, [initPlayer])

  // Reset player when run changes
  useEffect(() => {
    playerRef.current = null
    setIsPlayerReady(false)
  }, [runId])

  return {
    containerRef,
    isPlayerReady,
    isLoading: recordingQuery.isLoading,
    error: recordingQuery.error,
    hasRecording:
      recordingQuery.data?.type !== undefined &&
      recordingQuery.data.type !== 'none',
    recordingType: recordingQuery.data?.type ?? 'none',
    terminalRecording:
      recordingQuery.data?.type === 'terminal'
        ? recordingQuery.data.recording
        : null,
  }
}
