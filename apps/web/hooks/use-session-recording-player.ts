'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import 'rrweb-player/dist/style.css'

import { useTRPC } from '@/lib/trpc-client'

type UseSessionRecordingPlayerArgs = {
  runId: string
}

export function useSessionRecordingPlayer({
  runId,
}: UseSessionRecordingPlayerArgs) {
  const trpc = useTRPC()
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<unknown>(null)
  const [isPlayerReady, setIsPlayerReady] = useState(false)

  const recordingQuery = trpc.browserAgents.getRecording.useQuery(
    { runId },
    { enabled: !!runId },
  )

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

    playerRef.current = new rrwebPlayer.default({
      target: containerRef.current,
      props: {
        events: recordingQuery.data.events,
        width: 800,
        height: 450,
        autoPlay: false,
        showController: true,
        speedOption: [0.5, 1, 2, 4],
      },
    })

    setIsPlayerReady(true)
  }, [recordingQuery.data])

  useEffect(() => {
    void initPlayer()

    return () => {
      if (playerRef.current) {
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
