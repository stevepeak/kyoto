'use client'

import { type Story } from '@app/schemas'

import { IntegrationsPanel } from '@/components/stories/integrations-panel'

import { NewStoryMenu } from './new-story-menu'
import { StoryList } from './story-list'
import { TabNav } from './tab-nav'

type ActiveTab = 'stories' | 'integrations'

type StoriesSidebarProps = {
  activeTab: ActiveTab
  setActiveTab: (tab: ActiveTab) => void
  stories: Story[]
  selectedStoryId: string | null
  setSelectedStoryId: (id: string) => void
  isStoriesLoading: boolean
  isCreating: boolean
  onCreateStory: (testType: 'browser' | 'vm') => void
}

export function StoriesSidebar({
  activeTab,
  setActiveTab,
  stories,
  selectedStoryId,
  setSelectedStoryId,
  isStoriesLoading,
  isCreating,
  onCreateStory,
}: StoriesSidebarProps) {
  return (
    <div className="w-72 flex-shrink-0 border-r bg-muted/30">
      <div className="flex h-full flex-col">
        <TabNav activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'stories' ? (
          <>
            <NewStoryMenu
              isCreating={isCreating}
              onCreateStory={onCreateStory}
            />
            <div className="flex-1 overflow-auto p-2">
              <StoryList
                stories={stories}
                selectedStoryId={selectedStoryId}
                onStorySelect={setSelectedStoryId}
                isLoading={isStoriesLoading}
              />
            </div>
          </>
        ) : (
          <IntegrationsPanel />
        )}
      </div>
    </div>
  )
}
