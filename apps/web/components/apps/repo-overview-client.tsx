'use client'

import { useRouter } from 'next/navigation'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@app/api'

import { RepoOverview } from './repo-overview'

type RouterOutputs = inferRouterOutputs<AppRouter>
type RunsOutput = RouterOutputs['run']['listByRepo']
type StoryItem = RouterOutputs['story']['listByRepo']['stories'][number]
type RunItem = RunsOutput['runs'][number]

interface RepoOverviewClientProps {
  orgName: string
  repoName: string
  defaultBranch: string | null
  runs: RunItem[]
  stories: StoryItem[]
}

/**
 * Client component wrapper for RepoOverview that handles refresh functionality
 */
export function RepoOverviewClient({
  orgName,
  repoName,
  defaultBranch,
  runs,
  stories,
}: RepoOverviewClientProps) {
  const router = useRouter()

  const handleRefreshRuns = () => {
    // Refresh the server component data
    router.refresh()
  }

  return (
    <RepoOverview
      orgName={orgName}
      repoName={repoName}
      defaultBranch={defaultBranch}
      runs={runs}
      stories={stories}
      onRefreshRuns={handleRefreshRuns}
    />
  )
}

