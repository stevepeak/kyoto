import { useEffect, useState } from 'react'

import { useTRPCClient } from '@/client/trpc'
import { AppLayout } from '@/components/layout'
import { ActionList } from '@/components/actions/ActionList'
import { LoadingProgress } from '@/components/ui/loading-progress'

interface ActionItem {
  id: string
  runId: string
  status: 'queued' | 'running' | 'success' | 'failed'
  createdAt: string
  commitSha: string
}

export function RepoActionsLoader({
  orgSlug,
  repoName,
}: {
  orgSlug: string
  repoName: string
}) {
  const trpc = useTRPCClient()
  const [isLoading, setIsLoading] = useState(true)
  const [actions, setActions] = useState<ActionItem[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    async function load() {
      try {
        const resp = await trpc.action.listByRepo.query({ orgSlug, repoName })
        if (!isMounted) {
          return
        }
        setActions(resp.actions)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load actions')
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
    <AppLayout
      breadcrumbs={[
        { label: orgSlug, href: `/org/${orgSlug}` },
        { label: repoName, href: `/org/${orgSlug}/repo/${repoName}` },
      ]}
    >
      {isLoading ? (
        <LoadingProgress label="Loading actions..." />
      ) : error ? (
        <div className="p-6 text-sm text-red-500">{error}</div>
      ) : (
        <div className="p-6">
          <h1 className="text-xl font-semibold text-foreground">Actions</h1>
          <div className="mt-4 border rounded-md p-3">
            <ActionList actions={actions} />
          </div>
        </div>
      )}
    </AppLayout>
  )
}
