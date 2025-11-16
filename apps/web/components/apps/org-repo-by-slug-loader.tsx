import { Suspense } from 'react'

import { getTRPCCaller } from '@/lib/trpc-server'
import { LoadingProgress } from '@/components/ui/loading-progress'

import { OrgRepoDashboard } from './org-repo-dashboard'

interface OrgData {
  id: string
  slug: string
  name: string
}

interface RepoItem {
  id: string
  name: string
  defaultBranch?: string
  isPrivate: boolean
  storyCount: number
  lastRunStatus: 'pass' | 'fail' | 'skipped' | 'running' | 'error' | null
  lastRunAt: Date | null
}

async function OrgRepoContent({ orgName }: { orgName: string }) {
  const trpc = await getTRPCCaller()

  const reposResp = await trpc.repo.listByOrg({ orgName })

  const org: OrgData = reposResp.owner
    ? {
        id: reposResp.owner.id,
        slug: reposResp.owner.slug,
        name: reposResp.owner.name,
      }
    : { id: orgName, slug: orgName, name: orgName }

  const repos: RepoItem[] = (
    reposResp.repos as Array<{
      id: string
      name: string
      defaultBranch: string | null
      enabled: boolean
      isPrivate: boolean
      storyCount: number
      lastRunStatus: 'pass' | 'fail' | 'skipped' | 'running' | 'error' | null
      lastRunAt: Date | null
    }>
  )
    .filter((r) => r.enabled)
    .map((r) => ({
      id: r.id,
      name: r.name,
      defaultBranch: r.defaultBranch ?? undefined,
      isPrivate: r.isPrivate,
      storyCount: r.storyCount,
      lastRunStatus: r.lastRunStatus,
      lastRunAt: r.lastRunAt,
    }))

  return <OrgRepoDashboard org={org} repos={repos} />
}

export function OrgRepoBySlugLoader({ orgName }: { orgName: string }) {
  return (
    <Suspense fallback={<LoadingProgress label="Loading organization..." />}>
      <OrgRepoContent orgName={orgName} />
    </Suspense>
  )
}
