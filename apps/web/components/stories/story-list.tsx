'use client'

import { type Story } from '@app/schemas'
import { TEMP_STORY_ID } from '@app/utils'
import { Globe, Terminal } from 'lucide-react'

import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

type StoryListProps = {
  stories: Story[]
  selectedStoryId: string | null
  onStorySelect: (id: string) => void
  isLoading: boolean
}

export function StoryList({
  stories,
  selectedStoryId,
  onStorySelect,
  isLoading,
}: StoryListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner />
      </div>
    )
  }

  if (stories.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No stories yet
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {stories.map((story: Story) => {
        const isTemp = story.id === TEMP_STORY_ID
        return (
          <button
            key={story.id}
            onClick={() => onStorySelect(story.id)}
            className={cn(
              'w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              selectedStoryId === story.id &&
                'bg-accent text-accent-foreground',
            )}
          >
            <div className="flex items-center gap-2">
              {story.testType === 'browser' ? (
                <Globe className="size-3 shrink-0 text-violet-500" />
              ) : (
                <Terminal className="size-3 shrink-0 text-amber-500" />
              )}
              <span className="truncate font-medium">{story.name}</span>
              {isTemp && (
                <span className="text-xs text-muted-foreground">(unsaved)</span>
              )}
            </div>
            {story.scheduleText && (
              <div className="ml-5 truncate text-xs text-muted-foreground">
                {story.scheduleText}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
