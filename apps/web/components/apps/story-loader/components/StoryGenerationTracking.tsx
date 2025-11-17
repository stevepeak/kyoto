import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { useTriggerDevTracking } from '@/components/common/workflow-tracking-dialog'

export function StoryGenerationTracking() {
  const { isLoading, isCompleted, error, closeDialog } = useTriggerDevTracking()

  if (isLoading) {
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
    return (
      <EmptyState
        kanji="せいこう"
        kanjiTitle="Seikō - success."
        title="Story generated"
        description="Your story has been generated and added to the editor."
        action={<Button onClick={closeDialog}>Close</Button>}
      />
    )
  }

  return (
    <EmptyState
      title="Preparing generation..."
      description="Setting up story generation."
    />
  )
}
