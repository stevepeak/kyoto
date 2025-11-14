import ReactMarkdown from 'react-markdown'
import {
  formatDate,
  formatDurationMs,
  formatRelativeTime,
  getDisplayStatus,
  getStatusPillStyles,
  getStoryTimestamps,
} from '../utils'
import type { RunStory } from '../types'

interface RunStoryCardHeaderProps {
  story: RunStory
}

export function RunStoryCardHeader({ story }: RunStoryCardHeaderProps) {
  const storyTitle = story.story ? story.story.name : 'Story not found'
  const {
    startedAt: startedTimestamp,
    completedAt: completedTimestamp,
    durationMs,
  } = getStoryTimestamps(story)
  const durationDisplay = formatDurationMs(durationMs)
  const startedTooltip = startedTimestamp
    ? formatDate(startedTimestamp)
    : undefined
  const completedRelative = completedTimestamp
    ? formatRelativeTime(completedTimestamp)
    : null
  const displayStatus = getDisplayStatus(story)
  const statusPill = getStatusPillStyles(displayStatus)
  const statusDescriptor = statusPill.label.toLowerCase()
  const isRunning = displayStatus === 'running'
  const timelineParts: string[] = []
  if (completedRelative && !isRunning) {
    timelineParts.push(completedRelative)
  }
  if (durationDisplay !== '—' && !isRunning) {
    timelineParts.push(`in ${durationDisplay}`)
  }
  const statusLine =
    timelineParts.length > 0
      ? `${statusDescriptor} ${timelineParts.join(' ')}`
      : statusDescriptor

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">
            {storyTitle}
          </h3>
          {!isRunning && (
            <div
              className="text-sm text-muted-foreground"
              title={startedTooltip}
            >
              {statusLine}
            </div>
          )}
          {story.summary ? (
            <div className="prose prose-sm max-w-none text-muted-foreground">
              <ReactMarkdown>{story.summary}</ReactMarkdown>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

