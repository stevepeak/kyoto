import { Suspense } from 'react'

import { getTRPCCaller } from '@/lib/trpc-server'
import { LoadingProgress } from '@/components/ui/loading-progress'

import { RepoOverviewClient } from './repo-overview-client'

async function RepoOverviewContent({
  orgName,
  repoName,
}: {
  orgName: string
  repoName: string
}) {
  const trpc = await getTRPCCaller()

  const [repoResp, runsResp, storiesResp] = await Promise.all([
    trpc.repo.getBySlug({ orgName, repoName }),
    trpc.run.listByRepo({ orgName, repoName }),
    trpc.story.listByRepo({ orgName, repoName }),
  ])

  const repo = repoResp.repo
  const runs = runsResp.runs
  const stories = storiesResp.stories

  return (
    <RepoOverviewClient
      orgName={orgName}
      repoName={repoName}
      defaultBranch={repo?.defaultBranch ?? null}
      runs={runs}
      stories={stories}
    />
  )
}

export function RepoOverviewLoader({
  orgName,
  repoName,
}: {
  orgName: string
  repoName: string
}) {
  return (
    <Suspense fallback={<LoadingProgress label="Loading repository..." />}>
      <RepoOverviewContent orgName={orgName} repoName={repoName} />
    </Suspense>
  )
}
