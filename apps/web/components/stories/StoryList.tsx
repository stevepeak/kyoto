import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { KeyboardShortcutHint } from '@/components/common/keyboard-shortcut-hint'
import { StoryCard } from './StoryCard'

import type { StoryState } from '@app/db/types'
import type { TestStatus } from '@app/schemas'

type StoryStatus = TestStatus | null

interface StoryItem {
  id: string
  name: string
  story: string
  state: StoryState
  createdAt: string | null
  updatedAt: string | null
  groups: string[]
  latestStatus: StoryStatus
  latestStatusAt: string | null
}

interface StoryListProps {
  stories: StoryItem[]
  orgName: string
  repoName: string
}

export function StoryList({ stories, orgName, repoName }: StoryListProps) {
  if (stories.length === 0) {
    return (
      <>
        <style>{`
          @keyframes shimmer {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(100%);
            }
          }
          .shimmer-effect {
            animation: shimmer 3s infinite;
          }
        `}</style>
        <EmptyState
          kanji="さくせい"
          kanjiTitle="Sakusei - to create."
          title="Craft your first story"
          description="Stories encapsulate the intent of a user behavior or technical workflow within your product. Articulate your story in natural language, then Kyoto will evaluate the intent to ensure the code aligns with your requirements."
          action={
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Button asChild size="lg">
                <a href={`/org/${orgName}/repo/${repoName}/stories/new`}>
                  Craft new story
                  <KeyboardShortcutHint />
                </a>
              </Button>
            </div>
          }
        />
      </>
    )
  }

  return (
    <ul className="divide-y divide-border">
      {stories.map((story) => (
        <li key={story.id}>
          <StoryCard
            id={story.id}
            name={story.name}
            href={`/org/${orgName}/repo/${repoName}/stories/${story.id}`}
            groups={story.groups}
            state={story.state}
          />
        </li>
      ))}
    </ul>
  )
}
