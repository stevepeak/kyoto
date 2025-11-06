import { StoryCard } from './StoryCard'

interface StoryItem {
  id: string
  name: string
  story: string
  commitSha: string | null
  branchName: string
  createdAt: string | null
  updatedAt: string | null
}

interface StoryListProps {
  stories: StoryItem[]
  orgSlug: string
  repoName: string
  branchName: string
}

export function StoryList({
  stories,
  orgSlug,
  repoName,
  branchName: _branchName,
}: StoryListProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4">
        {stories.map((story) => (
          <StoryCard
            key={story.id}
            id={story.id}
            name={story.name}
            story={story.story}
            href={`/org/${orgSlug}/repo/${repoName}/stories/${story.id}`}
          />
        ))}
      </div>
    </div>
  )
}
