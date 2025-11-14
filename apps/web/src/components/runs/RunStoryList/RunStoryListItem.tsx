import { cn } from '@/lib/utils'
import { StoryStatusCheck } from '../shared/StoryStatusCheck'
import {
  formatDurationMs,
  formatRelativeTime,
  getDisplayStatus,
  getStoryTimestamps,
} from '../utils'
import type { RunStory } from '../types'

interface RunStoryListItemProps {
  story: RunStory
  isSelected: boolean
  onSelect: () => void
}

export function RunStoryListItem({
  story,
  isSelected,
  onSelect,
}: RunStoryListItemProps) {
  const storyTitle = story.story ? story.story.name : 'Story not found'
  const { completedAt: completedTimestamp, durationMs } =
    getStoryTimestamps(story)
  const durationDisplay = formatDurationMs(durationMs)
  const completedRelative = completedTimestamp
    ? formatRelativeTime(completedTimestamp)
    : null
  const displayStatus = getDisplayStatus(story)
  const isRunning = displayStatus === 'running'

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
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
}

