'use client'

import { Loader2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import 'rrweb-player/dist/style.css'

import { Button } from '@/components/ui/button'
import { useTRPC } from '@/lib/trpc-client'

type SessionRecordingPlayerProps = {
  runId: string
  onClose: () => void
}

export function SessionRecordingPlayer({
  runId,
  onClose,
}: SessionRecordingPlayerProps) {
  const trpc = useTRPC()
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<unknown>(null)
  const [isPlayerReady, setIsPlayerReady] = useState(false)

  const recordingQuery = trpc.xpBrowserAgents.getRecording.useQuery(
    { runId },
    { enabled: !!runId },
  )

  const initPlayer = useCallback(async () => {
    if (
      !containerRef.current ||
      !recordingQuery.data?.events ||
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
        width: 960,
        height: 540,
        autoPlay: true,
        showController: true,
        speedOption: [0.5, 1, 2, 4],
      },
    })

    setIsPlayerReady(true)
  }, [recordingQuery.data?.events])

  useEffect(() => {
    void initPlayer()

    return () => {
      if (playerRef.current) {
        playerRef.current = null
      }
    }
  }, [initPlayer])

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="relative max-h-[90vh] max-w-[95vw] overflow-hidden rounded-lg bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-lg font-semibold">Session Recording</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-5" />
          </Button>
        </div>

        {/* Player container */}
        <div className="flex min-h-[400px] items-center justify-center p-4">
          {recordingQuery.isLoading ? (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="size-8 animate-spin" />
              <span>Loading recording...</span>
            </div>
          ) : recordingQuery.error ? (
            <div className="flex flex-col items-center gap-3 text-destructive">
              <span>Failed to load recording</span>
              <span className="text-sm text-muted-foreground">
                {recordingQuery.error.message}
              </span>
            </div>
          ) : !isPlayerReady ? (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="size-8 animate-spin" />
              <span>Initializing player...</span>
            </div>
          ) : null}
          <div
            ref={containerRef}
            className={isPlayerReady ? 'block' : 'hidden'}
          />
        </div>
      </div>
    </div>
  )
}
