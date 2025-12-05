'use client'

import { useCallback, useEffect, useState } from 'react'

import { useTRPCClient } from '@/client/trpc'
import { AppLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { LoadingProgress } from '@/components/ui/loading-progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/common/EmptyState'
import { SiGithub } from 'react-icons/si'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useTriggerRun } from '@/hooks/use-trigger-run'

interface OrgItem {
  slug: string
  name: string
  accountName: string | null
  repoCount: number
}

export function OrgListApp() {
  const trpc = useTRPCClient()
  const [isLoading, setIsLoading] = useState(true)
  const [orgs, setOrgs] = useState<OrgItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [triggerHandle, setTriggerHandle] = useState<{
    runId: string
    publicAccessToken: string
  } | null>(null)
  const [isStartingRefresh, setIsStartingRefresh] = useState(false)

  const GITHUB_APP_SLUG = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG || ''
  const installUrl = `https://github.com/apps/${GITHUB_APP_SLUG}/installations/new`

  const queryOrganizations = useCallback(async () => {
    const data = await trpc.org.listInstalled.query()
    return data.orgs
  }, [trpc])

  // Track trigger run and update toast with streaming text
  const { isLoading: isRefreshingInstallation } = useTriggerRun({
    runId: triggerHandle?.runId ?? null,
    publicAccessToken: triggerHandle?.publicAccessToken ?? null,
    onComplete: () => {
      setTriggerHandle(null)
      setIsStartingRefresh(false)
      // Refresh orgs list after sync completes
      void queryOrganizations().then((refreshedOrgs) => {
        setOrgs(refreshedOrgs)
      })
    },
    onError: (err) => {
      console.log('[❌ onError] Run error:', err)
      setTriggerHandle(null)
      setIsStartingRefresh(false)
    },
  })

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
    setIsStartingRefresh(true)
    try {
      const result = await trpc.org.refreshInstallations.mutate()
      console.log('[Button]handleRefresh', result)

      // Clear any existing run before starting a new one
      setTriggerHandle(null)

      // Set run tracking info if available
      if (result.triggerHandle?.publicAccessToken && result.triggerHandle?.id) {
        setTriggerHandle({
          runId: result.triggerHandle.id,
          publicAccessToken: result.triggerHandle.publicAccessToken,
        })
        // isStartingRefresh will be cleared when isTriggerRunLoading becomes true
      } else {
        // If no trigger handle, refresh orgs immediately
        const refreshedOrgs = await queryOrganizations()
        setOrgs(refreshedOrgs)
        setIsStartingRefresh(false)
      }

      setError(null)
    } catch (e) {
      console.error('[🔄 Button Clicked] Error:', e)
      setError(
        e instanceof Error ? e.message : 'Failed to refresh organizations',
      )
      // Error toast will be shown by useTriggerRun hook if runId is set
      setIsStartingRefresh(false)
    } finally {
      setIsLoading(false)
    }
  }, [queryOrganizations, trpc])

  // Clear isStartingRefresh once the trigger run starts tracking
  useEffect(() => {
    if (isRefreshingInstallation && isStartingRefresh) {
      setIsStartingRefresh(false)
    }
  }, [isRefreshingInstallation, isStartingRefresh])

  // Button should be disabled while starting refresh or trigger run is loading
  const isRefreshing = isStartingRefresh || isRefreshingInstallation

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
    </AppLayout>
  )
}
