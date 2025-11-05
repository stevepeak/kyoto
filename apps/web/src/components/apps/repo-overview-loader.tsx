import { useEffect, useState } from 'react'

import { useTRPCClient } from '@/client/trpc'
import { LoadingProgress } from '@/components/ui/loading-progress'
import { AppProvider } from '@/components/providers/app-provider'

import { RepoOverview } from './repo-overview'

interface BranchItem {
  name: string
  headSha?: string
  updatedAt?: string
}

export function RepoOverviewLoader({
  orgSlug,
  repoName,
}: {
  orgSlug: string
  repoName: string
}) {
  const trpc = useTRPCClient()
  const [isLoading, setIsLoading] = useState(true)
  const [branches, setBranches] = useState<BranchItem[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    async function load() {
      try {
        const resp = await trpc.branch.listByRepo.query({
          orgSlug,
          repoName,
        })
        if (!isMounted) {
          return
        }
        setBranches(resp.branches)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load branches')
      } finally {
        setIsLoading(false)
      }
    }
    void load()
    return () => {
      isMounted = false
    }
  }, [trpc, orgSlug, repoName])

  return (
    <AppProvider>
      {isLoading ? (
        <LoadingProgress label="Loading repository..." />
      ) : error ? (
        <div className="p-6 text-sm text-red-500">{error}</div>
      ) : (
        <RepoOverview orgSlug={orgSlug} repoName={repoName} branches={branches} />
      )}
    </AppProvider>
  )
}


