'use client'

import { useCallback, useEffect, useState } from 'react'

import { useTRPCClient } from '@/client/trpc'
import { AppLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { LoadingProgress } from '@/components/ui/loading-progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/common/EmptyState'
import { SiGithub } from 'react-icons/si'
import { RefreshCw, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  VisuallyHidden,
} from '@/components/ui/dialog'
import { useTriggerRun } from '@/hooks/use-trigger-run'

interface OrgItem {
  slug: string
  name: string
  accountName: string | null
  repoCount: number
}

interface OrgSyncTrackingContentProps {
  runId: string | null
  publicAccessToken: string | null
  onClose: () => void
}

function OrgSyncTrackingContent({
  runId,
  publicAccessToken,
  onClose,
}: OrgSyncTrackingContentProps) {
  const { isLoading, isFailed, error } = useTriggerRun({
    runId,
    publicAccessToken,
    enabled: runId !== null && publicAccessToken !== null,
    onComplete: () => {
      // Dialog will be closed by parent after delay
    },
  })

  const displayError = error
    ? error instanceof Error
      ? error.message
      : String(error)
    : isFailed
      ? 'Workflow failed'
      : null

  if (isLoading) {
    return (
      <EmptyState
        kanji="せつぞく"
        kanjiTitle="Setsuzoku - to connect."
        title="Syncing repositories..."
        description="Refreshing your organization's repositories and memberships. This may take a few moments."
        action={
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">
              Tracking sync status...
            </span>
          </div>
        }
      />
    )
  }

  if (displayError) {
    return (
      <EmptyState
        title="Sync failed"
        description={displayError}
        action={
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        }
      />
    )
  }

  return (
    <EmptyState
      title="Waiting for sync..."
      description="Preparing to sync your organization."
    />
  )
}

export function OrgListApp() {
  const trpc = useTRPCClient()
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [orgs, setOrgs] = useState<OrgItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [runId, setRunId] = useState<string | null>(null)
  const [publicAccessToken, setPublicAccessToken] = useState<string | null>(
    null,
  )

  const GITHUB_APP_SLUG = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG || ''
  const installUrl = `https://github.com/apps/${GITHUB_APP_SLUG}/installations/new`

  const queryOrganizations = useCallback(async () => {
    const data = await trpc.org.listInstalled.query()
    return data.orgs
  }, [trpc])

  useEffect(() => {
    let isMounted = true

    void (async () => {
      try {
        const loadedOrgs = await queryOrganizations()
        if (!isMounted) {
          return
        }
        setOrgs(loadedOrgs)
        setError(null)
      } catch (e) {
        if (!isMounted) {
          return
        }
        setError(
          e instanceof Error ? e.message : 'Failed to load organizations',
        )
      } finally {
        if (!isMounted) {
          return
        }
        setIsLoading(false)
      }
    })()

    return () => {
      isMounted = false
    }
  }, [queryOrganizations])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const result = await trpc.org.refreshInstallations.mutate()

      // Open dialog with run tracking info if available
      if (result.triggerHandle?.publicAccessToken && result.triggerHandle?.id) {
        setRunId(result.triggerHandle.id)
        setPublicAccessToken(result.triggerHandle.publicAccessToken)
        setDialogOpen(true)
      }

      const refreshedOrgs = await queryOrganizations()
      setOrgs(refreshedOrgs)
      setError(null)
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Failed to refresh organizations',
      )
    } finally {
      setIsRefreshing(false)
      setIsLoading(false)
    }
  }, [queryOrganizations, trpc])

  if (isLoading) {
    return (
      <AppLayout>
        <LoadingProgress label="Loading organizations..." />
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout>
        <div className="p-6 text-sm text-destructive">{error}</div>
      </AppLayout>
    )
  }

  if (orgs.length === 0) {
    return (
      <AppLayout>
        <EmptyState
          kanji="さくせい"
          kanjiTitle="Sakusei - to create."
          title="Connect your team"
          description="Install the GitHub app to get started with your organizations."
          action={
            <Button asChild size="lg">
              <a href={installUrl}>Install our GitHub App</a>
            </Button>
          }
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-6 flex flex-col h-full overflow-auto">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-display text-foreground">Teams</h1>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => void handleRefresh()}
                  disabled={isRefreshing}
                  aria-label="Refresh organizations"
                >
                  <RefreshCw
                    className={cn('h-4 w-4', isRefreshing && 'animate-spin')}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh teams and repos</TooltipContent>
            </Tooltip>
            <Button asChild>
              <a href={installUrl}>Add new organization</a>
            </Button>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {orgs.map((org) => (
            <a key={org.slug} href={`/org/${org.slug}`} className="block">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <SiGithub className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base font-semibold">
                      {org.accountName ?? org.name}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">@{org.slug}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {org.repoCount}
                    </span>{' '}
                    {org.repoCount === 1 ? 'repository' : 'repositories'}
                  </p>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      </div>
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setRunId(null)
            setPublicAccessToken(null)
            // Refresh orgs list when dialog closes
            void queryOrganizations().then((refreshedOrgs) => {
              setOrgs(refreshedOrgs)
            })
          }
        }}
      >
        <DialogContent className="max-w-lg !left-[50%] !top-[50%] !bottom-auto !translate-x-[-50%] !translate-y-[-50%] data-[state=closed]:!slide-out-to-bottom data-[state=open]:!slide-in-from-bottom data-[state=closed]:!zoom-out-100 data-[state=open]:!zoom-in-100 data-[state=closed]:!fade-out-0 data-[state=open]:!fade-in-0 sm:rounded-lg">
          <VisuallyHidden>
            <DialogTitle>Organization Sync</DialogTitle>
            <DialogDescription>
              Track the progress of your organization sync
            </DialogDescription>
          </VisuallyHidden>
          <OrgSyncTrackingContent
            runId={runId}
            publicAccessToken={publicAccessToken}
            onClose={() => {
              setDialogOpen(false)
              setRunId(null)
              setPublicAccessToken(null)
              // Refresh orgs list when dialog closes
              void queryOrganizations().then((refreshedOrgs) => {
                setOrgs(refreshedOrgs)
              })
            }}
          />
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
