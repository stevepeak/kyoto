import { useEffect, useState } from 'react'

import { useTRPCClient } from '@/client/trpc'
import { AppLayout } from '@/components/layout'
import { StoryList } from '@/components/stories/StoryList'
import { LoadingProgress } from '@/components/ui/loading-progress'

interface StoryItem {
  id: string
  title: string
  featureTitle: string
  updatedAt?: string
  href: string
}

export function BranchStoriesLoader({
  orgSlug,
  repoName,
  branchName,
}: {
  orgSlug: string
  repoName: string
  branchName: string
}) {
  const trpc = useTRPCClient()
  const [isLoading, setIsLoading] = useState(true)
  const [stories, setStories] = useState<StoryItem[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    async function load() {
      try {
        const resp = await trpc.story.listByBranch.query({
          orgSlug,
          repoName,
          branchName,
        })
        if (!isMounted) {
          return
        }
        const items: StoryItem[] = resp.stories.map((s) => ({
          id: s.id,
          title: s.title,
          featureTitle: s.featureTitle,
          updatedAt: s.updatedAt,
          href: `/org/${orgSlug}/repo/${repoName}/stories/${s.id}`,
        }))
        setStories(items)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load stories')
      } finally {
        setIsLoading(false)
      }
    }
    void load()
    return () => {
      isMounted = false
    }
  }, [trpc, orgSlug, repoName, branchName])

  return (
    <AppLayout>
      {isLoading ? (
        <LoadingProgress label="Loading stories..." />
      ) : error ? (
        <div className="p-6 text-sm text-red-500">{error}</div>
      ) : (
        <div className="p-6">
          <h1 className="text-xl font-semibold text-foreground">
            {branchName} stories
          </h1>
          <div className="mt-4 border rounded-md p-3">
            <StoryList stories={stories} />
          </div>
        </div>
      )}
    </AppLayout>
  )
}
