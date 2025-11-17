import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { useTriggerRun } from '@/hooks/use-trigger-run'

interface StoryGenerationTrackingProps {
  runId: string | null
  publicAccessToken: string | null
  onComplete?: () => void
  onClose?: () => void
}

export function StoryGenerationTracking({
  runId,
  publicAccessToken,
  onComplete,
  onClose,
}: StoryGenerationTrackingProps) {
  const [streamText, setStreamText] = useState('')
  const currentRunIdRef = useRef<string | null>(null)

  // Reset stream text when runId changes
  useEffect(() => {
    if (runId !== currentRunIdRef.current) {
      currentRunIdRef.current = runId
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setStreamText('')
      }, 0)
    }
  }, [runId])

  const handleStreamText = useCallback((text: string) => {
    setStreamText(text)
  }, [])

  const { isFailed, error } = useTriggerRun({
    runId,
    publicAccessToken,
    enabled: runId !== null && publicAccessToken !== null,
    onComplete: () => {
      if (onComplete) {
        onComplete()
      }
      // Close dialog after a brief delay to show success state
      if (onClose) {
        setTimeout(() => {
          onClose()
        }, 1000)
      }
    },
    onError: () => {
      // Error is handled via the error state
    },
    onStreamText: handleStreamText,
  })

  const displayError = error
    ? error instanceof Error
      ? error.message
      : String(error)
    : isFailed
      ? 'Workflow failed'
      : null

  if (displayError) {
    return (
      <EmptyState
        title="Generation failed"
        description={displayError}
        action={
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        }
      />
    )
  }

  return (
    <EmptyState
      kanji="そうぞう"
      kanjiTitle="Sōzō - creation."
      title="Curating a story"
      description="Analyzing your codebase to discover a new user story."
      action={
        <span
          className="text-gradient-ellipsis"
          title={streamText || 'Getting started...'}
        >
          {streamText || 'Getting started...'}
        </span>
      }
    />
  )
}
