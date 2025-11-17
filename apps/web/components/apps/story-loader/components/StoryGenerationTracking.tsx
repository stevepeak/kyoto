import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { useTriggerDevTracking } from '@/components/common/workflow-tracking-dialog'

export function StoryGenerationTracking() {
  const { isLoading, isCompleted, error, runId, closeDialog } =
    useTriggerDevTracking()

  // Show loading state if we have a runId (even if isLoading is false initially while run is loading)
  const isActuallyLoading =
    isLoading || (runId !== null && !isCompleted && error === null)

  if (isActuallyLoading) {
    return (
      <EmptyState
        kanji="そうぞう"
        kanjiTitle="Sōzō - creation."
        title="Generating story..."
        description="Analyzing your codebase to discover a new user story. This may take a minute."
        action={
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        }
      />
    )
  }

  if (error) {
    return (
      <EmptyState
        title="Generation failed"
        description={error}
        action={
          <Button onClick={closeDialog} variant="outline">
            Close
          </Button>
        }
      />
    )
  }

  if (isCompleted) {
    // Dialog will close automatically via onComplete callback in TriggerDevTrackingDialog
    return (
      <EmptyState
        kanji="せいこう"
        kanjiTitle="Seikō - success."
        title="Story generated"
        description="Your story has been generated and added to the editor."
      />
    )
  }

  // This should be unreachable - we should always have loading, error, or completed state
  return null
}
