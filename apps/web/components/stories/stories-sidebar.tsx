'use client'

import { type Story } from '@app/schemas'
import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

import { IntegrationsPanel } from '@/components/stories/integrations-panel'
import { Button } from '@/components/ui/button'
import { useTRPC } from '@/lib/trpc-client'

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
  const trpc = useTRPC()
  const subscriptionQuery = trpc.billing.getSubscription.useQuery()
  const planId = subscriptionQuery.data?.planId ?? 'free'
  const isFreePlan = planId === 'free'

  return (
    <div className="w-72 flex-shrink-0 border-r bg-muted/30">
      <div className="flex h-full flex-col">
        <TabNav activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'stories' ? (
          <>
            <NewStoryMenu
              isCreating={isCreating}
              onCreateStory={onCreateStory}
              stories={stories}
              planId={planId}
            />
            <div className="flex-1 overflow-auto p-2">
              <StoryList
                stories={stories}
                selectedStoryId={selectedStoryId}
                onStorySelect={setSelectedStoryId}
                isLoading={isStoriesLoading}
              />
            </div>
            {isFreePlan && (
              <div className="border-t p-4">
                <div className="rounded-lg border bg-card p-3">
                  <div className="mb-2 text-sm font-medium text-foreground">
                    Upgrade Account
                  </div>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Unlimited stories with Pro and Max plans
                  </p>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="w-full"
                  >
                    <Link href="/billing">
                      Upgrade
                      <ArrowUpRight className="ml-1 size-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <IntegrationsPanel />
        )}
      </div>
    </div>
  )
}
