'use client'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { Loader2 } from 'lucide-react'
import { useTriggerDevTracking } from '@/components/common/workflow-tracking-dialog'

export function RunTrackingContent() {
  const { isLoading, isCompleted, error, closeDialog } = useTriggerDevTracking()

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

  if (error) {
    return (
      <EmptyState
        title="Run failed"
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
    return (
      <EmptyState
        kanji="せいこう"
        kanjiTitle="Seikō - success."
        title="Run completed"
        description="Your CI run has completed successfully."
        action={<Button onClick={closeDialog}>Close</Button>}
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
