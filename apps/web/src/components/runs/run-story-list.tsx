import { cn } from '@/lib/utils'
import { StoryStatusCheck } from './StoryStatusCheck'
import {
  formatDurationMs,
  formatRelativeTime,
  getDisplayStatus,
  getStoryTimestamps,
} from './run-detail-view-utils'
import type { RunStory } from './run-detail-view-types'

interface RunStoryListProps {
  stories: RunStory[]
  selectedStoryId: string | null
  onStorySelect: (storyId: string) => void
}

export function RunStoryList({
  stories,
  selectedStoryId,
  onStorySelect,
}: RunStoryListProps) {
  return (
    <ul className="space-y-2">
      {stories.map((runStory) => {
        const storyTitle = runStory.story
          ? runStory.story.name
          : 'Story not found'
        const { completedAt: completedTimestamp, durationMs } =
          getStoryTimestamps(runStory)
        const durationDisplay = formatDurationMs(durationMs)
        const completedRelative = completedTimestamp
          ? formatRelativeTime(completedTimestamp)
          : null
        const displayStatus = getDisplayStatus(runStory)
        const isSelected = selectedStoryId === runStory.storyId
        const isRunning = displayStatus === 'running'

        return (
          <li key={runStory.storyId}>
            <button
              type="button"
              onClick={() => onStorySelect(runStory.storyId)}
              className={cn(
                'w-full rounded-md border px-3 py-3 text-left transition-colors',
                isSelected
                  ? 'border-primary bg-primary/10 text-primary-foreground'
                  : 'border-border hover:bg-muted',
              )}
            >
              <div className="flex items-start gap-3">
                <StoryStatusCheck status={displayStatus} />
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-foreground">
                      {storyTitle}
                    </span>
                  </div>
                  {!isRunning && (
                    <div className="text-xs text-muted-foreground">
                      {completedRelative
                        ? `${completedRelative}${
                            durationDisplay !== '—'
                              ? ` · ${durationDisplay}`
                              : ''
                          }`
                        : durationDisplay !== '—'
                          ? `Duration ${durationDisplay}`
                          : 'Awaiting completion'}
                    </div>
                  )}
                </div>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
