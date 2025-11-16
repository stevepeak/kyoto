import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { KeyboardShortcutHint } from '@/components/common/keyboard-shortcut-hint'
import { StoryCard } from './StoryCard'

import type { TestStatus } from '@app/schemas'

type StoryStatus = TestStatus | null

interface StoryItem {
  id: string
  name: string
  story: string
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
              <span className="text-xs text-muted">— or —</span>
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  window.alert('Coming soon')
                }}
                className="gap-2 border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 hover:from-primary/20 hover:via-primary/10 hover:to-primary/20 hover:border-primary/50 transition-all shadow-sm hover:shadow-md backdrop-blur-sm relative overflow-hidden group"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent shimmer-effect"></span>
                <Sparkles className="h-4 w-4 text-primary relative z-10" />
                <span className="relative z-10">AI Generate Story</span>
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
          />
        </li>
      ))}
    </ul>
  )
}
