'use client'

import { type Owner } from '@app/db'
import { RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { useTriggerRun } from '@/hooks/use-trigger-run'
import { useTRPC } from '@/lib/trpc-client'

interface OrganizationsListPageProps {
  organizations: Owner[]
}

export function OrganizationsListPage(props: OrganizationsListPageProps) {
  const { organizations } = props
  const router = useRouter()
  const trpc = useTRPC()
  const [triggerHandle, setTriggerHandle] = useState<{
    runId: string
    publicAccessToken: string
  } | null>(null)

  const { isLoading } = useTriggerRun({
    runId: triggerHandle?.runId ?? null,
    publicAccessToken: triggerHandle?.publicAccessToken ?? null,
    toastMessages: {
      onProgress: () => 'Syncing organizations from GitHub...',
      onSuccess: 'Organizations synced successfully! 🎉',
      onError: (error) =>
        `Sync failed: ${error instanceof Error ? error.message : String(error)}`,
    },
    onComplete: () => {
      setTriggerHandle(null)
      router.refresh()
    },
    onError: () => {
      setTriggerHandle(null)
    },
  })

  const syncMutation = trpc.trigger.syncInstallations.useMutation({
    onSuccess: (data) => {
      if (data.success && data.triggerHandle) {
        setTriggerHandle({
          runId: data.triggerHandle.id,
          publicAccessToken: data.triggerHandle.publicAccessToken,
        })
      } else {
        router.refresh()
      }
    },
  })

  const handleRefresh = () => {
    syncMutation.mutate()
  }

  const isRefreshing = syncMutation.isPending || isLoading

  return (
    <div className="container mx-auto min-h-screen py-12">
      <div className="space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-cormorant text-5xl font-semibold">
              Your Teams
            </h1>
            <p className="mt-2 text-muted-foreground">
              Teams you have access to
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={isRefreshing ? 'animate-spin' : ''} />
            {isRefreshing ? 'Syncing...' : 'Sync from GitHub'}
          </Button>
        </div>

        {organizations.length === 0 ? (
          <div className="rounded-lg border p-12 text-center">
            <p className="text-muted-foreground">
              You don&apos;t have access to any organizations yet.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {organizations.map((org) => (
              <Link
                key={org.id}
                href={`/~/${org.login}`}
                className="group flex flex-col gap-4 rounded-lg border p-6 transition-colors hover:border-foreground/20 hover:bg-accent"
              >
                <div className="flex items-start gap-3">
                  {org.avatarUrl && (
                    <img
                      src={org.avatarUrl}
                      alt={org.name ?? org.login}
                      className="size-12 rounded-full border"
                    />
                  )}
                  <div className="flex-1">
                    <h2 className="font-semibold group-hover:underline">
                      {org.name ?? org.login}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      @{org.login}
                    </p>
                  </div>
                </div>
                {org.type && (
                  <span className="text-xs text-muted-foreground">
                    {org.type}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
