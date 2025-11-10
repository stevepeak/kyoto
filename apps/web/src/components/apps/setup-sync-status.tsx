import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useTRPCClient } from '@/client/trpc'
import { AppLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { CheckCircle2, Clock, Loader2 } from 'lucide-react'

interface SetupStatus {
  hasInstallation: boolean
  hasEnabledRepos: boolean
}

interface SetupSyncStatusProps {
  pollIntervalMs?: number
  redirectOnCompletion?: boolean
}

const DEFAULT_POLL_INTERVAL = 5000

export function SetupSyncStatus({
  pollIntervalMs = DEFAULT_POLL_INTERVAL,
  redirectOnCompletion = true,
}: SetupSyncStatusProps) {
  const trpc = useTRPCClient()
  const isMountedRef = useRef(true)
  const [status, setStatus] = useState<SetupStatus | null>(null)
  const [orgCount, setOrgCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isPolling, setIsPolling] = useState(true)
  const [redirectScheduled, setRedirectScheduled] = useState(false)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const loadStatus = useCallback(async () => {
    try {
      setError(null)
      const nextStatus = await trpc.org.getSetupStatus.query()
      if (!isMountedRef.current) {
        return
      }

      setStatus(nextStatus)

      if (!nextStatus.hasInstallation) {
        setOrgCount(null)
        return
      }

      const installedOrgs = await trpc.org.listInstalled.query()
      if (!isMountedRef.current) {
        return
      }

      const nextOrgCount = installedOrgs.orgs.length
      setOrgCount(nextOrgCount)

      if (nextOrgCount > 0) {
        setIsPolling(false)
      }
    } catch (caught) {
      if (!isMountedRef.current) {
        return
      }

      const message =
        caught instanceof Error
          ? caught.message
          : 'Failed to check setup status'
      setError(message)
    }
  }, [trpc])

  useEffect(() => {
    void loadStatus()

    if (!isPolling) {
      return
    }

    const intervalId = window.setInterval(() => {
      void loadStatus()
    }, pollIntervalMs)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [isPolling, loadStatus, pollIntervalMs])

  useEffect(() => {
    if (
      !redirectOnCompletion ||
      redirectScheduled ||
      orgCount === null ||
      orgCount === 0
    ) {
      return
    }

    setRedirectScheduled(true)

    const timeoutId = window.setTimeout(() => {
      window.location.href = '/app'
    }, 1500)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [orgCount, redirectOnCompletion, redirectScheduled])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await trpc.org.refreshInstallations.mutate()
      await loadStatus()
    } catch (caught) {
      if (!isMountedRef.current) {
        return
      }

      const message =
        caught instanceof Error
          ? caught.message
          : 'Failed to refresh installations'
      setError(message)
    } finally {
      if (isMountedRef.current) {
        setIsRefreshing(false)
      }
    }
  }, [loadStatus, trpc])

  const handleRetry = useCallback(() => {
    setIsPolling(true)
    void loadStatus()
  }, [loadStatus])

  const steps = useMemo(() => {
    return [
      {
        key: 'installation',
        label: 'GitHub app installed',
        description: 'Waiting for GitHub to confirm the installation.',
        complete: status?.hasInstallation ?? false,
      },
      {
        key: 'repos',
        label: 'Repositories connected',
        description:
          'Syncing repositories selected during installation so they appear in Kyoto.',
        complete: status?.hasEnabledRepos ?? false,
      },
    ]
  }, [status])

  const firstIncompleteIndex = useMemo(() => {
    return steps.findIndex((step) => !step.complete)
  }, [steps])

  const showSuccess =
    (status?.hasInstallation ?? false) && (orgCount ?? 0) > 0 && !error

  return (
    <AppLayout>
      <div className="flex h-full w-full items-center justify-center px-4 py-10 md:py-16">
        <Card className="w-full max-w-xl text-center">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">
              {showSuccess ? 'All set! Redirecting you...' : 'Finishing setup'}
            </CardTitle>
            <CardDescription>
              {showSuccess
                ? 'We found your organization and will take you to your dashboard.'
                : 'Stay on this page while we confirm your GitHub installation and sync repositories.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            ) : (
              <ul className="space-y-4 text-left">
                {steps.map((step, index) => {
                  const iconClassName = 'h-5 w-5'
                  const isPending = !step.complete
                  const isActivePending =
                    isPending && index === firstIncompleteIndex

                  return (
                    <li
                      key={step.key}
                      className="flex items-start gap-3 rounded-md border border-border/60 px-3 py-3"
                    >
                      {step.complete ? (
                        <CheckCircle2
                          className={cn(iconClassName, 'text-chart-1')}
                          aria-hidden="true"
                        />
                      ) : isActivePending ? (
                        <Loader2
                          className={cn(
                            iconClassName,
                            'animate-spin text-primary',
                          )}
                          aria-hidden="true"
                        />
                      ) : (
                        <Clock
                          className={cn(iconClassName, 'text-muted-foreground')}
                          aria-hidden="true"
                        />
                      )}
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">
                          {step.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {step.description}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
            <div className="flex flex-col items-center gap-3">
              <div className="text-xs text-muted-foreground">
                {showSuccess
                  ? 'You can jump ahead if you prefer.'
                  : 'This usually takes less than a minute.'}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  onClick={() => void handleRefresh()}
                  disabled={isRefreshing}
                  variant="outline"
                >
                  {isRefreshing ? (
                    <span className="flex items-center gap-2">
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                      Refreshing…
                    </span>
                  ) : (
                    'Refresh now'
                  )}
                </Button>
                {error ? (
                  <Button onClick={() => handleRetry()}>Try again</Button>
                ) : (
                  <Button
                    asChild
                    variant={showSuccess ? 'default' : 'secondary'}
                  >
                    <a href="/app">Go to dashboard</a>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
