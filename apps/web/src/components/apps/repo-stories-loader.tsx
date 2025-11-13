import { useEffect, useState } from 'react'

import { useTRPCClient } from '@/client/trpc'
import { AppLayout } from '@/components/layout'
import { StoryList } from '@/components/stories/StoryList'
import { LoadingProgress } from '@/components/ui/loading-progress'

interface StoryItem {
  id: string
  name: string
  story: string
  commitSha: string | null
  branchName: string
  createdAt: string | null
  updatedAt: string | null
  groups: string[]
  latestStatus: 'pass' | 'fail' | 'error' | 'running' | null
  latestStatusAt: string | null
}

export function RepoStoriesLoader({
  orgName,
  repoName,
}: {
  orgName: string
  repoName: string
}) {
  const trpc = useTRPCClient()
  const [isLoading, setIsLoading] = useState(true)
  const [stories, setStories] = useState<StoryItem[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    async function load() {
      try {
        const resp = await trpc.story.listByRepo.query({
          orgName,
          repoName,
        })
        if (!isMounted) {
          return
        }
        setStories(resp.stories as StoryItem[])
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
  }, [trpc, orgName, repoName])

  return (
    <AppLayout
      breadcrumbs={[
        { label: orgName, href: `/org/${orgName}` },
        { label: repoName, href: `/org/${orgName}/repo/${repoName}` },
      ]}
    >
      {isLoading ? (
        <LoadingProgress label="Loading stories..." />
      ) : error ? (
        <div className="p-6 text-sm text-red-500">{error}</div>
      ) : (
        <div className="p-6">
          <h1 className="text-xl font-semibold text-foreground">Stories</h1>
          <div className="mt-4 border rounded-md p-3">
            <StoryList
              stories={stories}
              orgName={orgName}
              repoName={repoName}
            />
          </div>
        </div>
      )}
    </AppLayout>
  )
}
