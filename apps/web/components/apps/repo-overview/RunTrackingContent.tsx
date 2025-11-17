import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { Loader2 } from 'lucide-react'
import { useTriggerRun } from '@/hooks/use-trigger-run'

interface RunTrackingContentProps {
  runId: string | null
  publicAccessToken: string | null
  onClose: () => void
}

export function RunTrackingContent({
  runId,
  publicAccessToken,
  onClose,
}: RunTrackingContentProps) {
  const { isLoading, isCompleted, isFailed, error } = useTriggerRun({
    runId,
    publicAccessToken,
    enabled: runId !== null && publicAccessToken !== null,
    onComplete: () => {
      // Dialog will be closed by parent after delay
    },
  })

  const displayError = error
    ? error instanceof Error
      ? error.message
      : String(error)
    : isFailed
      ? 'Workflow failed'
      : null

  if (isLoading) {
    return (
      <EmptyState
        kanji="いとかんしょう"
        kanjiTitle="Ito-kenshō - intent testing."
        title="Running tests..."
        description="Your CI run is in progress. This may take a few minutes."
        action={
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        }
      />
    )
  }

  if (displayError) {
    return (
      <EmptyState
        title="Run failed"
        description={displayError}
        action={
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        }
      />
    )
  }

  if (isCompleted) {
    return (
      <EmptyState
        kanji="せいこう"
        kanjiTitle="Seikō - success."
        title="Run completed"
        description="Your CI run has completed successfully."
        action={<Button onClick={onClose}>Close</Button>}
      />
    )
  }

  return (
    <EmptyState
      title="Waiting for run..."
      description="Preparing to track your CI run."
    />
  )
}
