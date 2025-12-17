'use client'

import { useEffect, useRef } from 'react'
import 'asciinema-player/dist/bundle/asciinema-player.css'

type TerminalPlayerProps = {
  /** The asciicast v2 recording content (JSONL format) */
  recording: string
  /** Player theme (default: 'dracula') */
  theme?: string
  /** Limit idle time between frames in seconds (default: 2) */
  idleTimeLimit?: number
  /** Playback speed multiplier (default: 1) */
  speed?: number
  /** Fit mode: 'width', 'height', 'both', or 'none' (default: 'width') */
  fit?: 'width' | 'height' | 'both' | 'none'
  /** Whether to autoplay on mount (default: false) */
  autoPlay?: boolean
  /** Whether to loop playback (default: false) */
  loop?: boolean
  /** Additional CSS classes for the container */
  className?: string
}

export function TerminalPlayer({
  recording,
  theme = 'dracula',
  idleTimeLimit = 2,
  speed = 1,
  fit = 'width',
  autoPlay = false,
  loop = false,
  className,
}: TerminalPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<unknown>(null)
  const urlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!containerRef.current || !recording) return

    // Dynamic import since asciinema-player is client-only
    void import('asciinema-player').then((asciinemaPlayerModule) => {
      // Clear previous player
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }

      // Revoke previous blob URL
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current)
      }

      // Create blob URL from recording content
      const blob = new Blob([recording], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      urlRef.current = url

      // Create the player
      playerRef.current = asciinemaPlayerModule.create(
        url,
        containerRef.current,
        {
          theme,
          fit,
          idleTimeLimit,
          speed,
          autoPlay,
          loop,
        },
      )
    })

    // Cleanup on unmount
    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current)
        urlRef.current = null
      }
    }
  }, [recording, theme, idleTimeLimit, speed, fit, autoPlay, loop])

  return (
    <div
      ref={containerRef}
      className={className}
      data-testid="terminal-player"
    />
  )
}
