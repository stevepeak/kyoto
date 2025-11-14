import type { RunStory } from '../types'
import { RunStoryListItem } from './RunStoryListItem'

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
      {stories.map((runStory) => (
        <RunStoryListItem
          key={runStory.storyId}
          story={runStory}
          isSelected={selectedStoryId === runStory.storyId}
          onSelect={() => onStorySelect(runStory.storyId)}
        />
      ))}
    </ul>
  )
}

