'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTriggerRun } from '@/hooks/use-trigger-run'
import { useTRPCClient } from '@/client/trpc'
import { AppLayout } from '@/components/layout'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface SetupInstallAppProps {
  installationId?: number
}

export function SetupPage({ installationId }: SetupInstallAppProps) {
  const router = useRouter()
  const trpc = useTRPCClient()
  const [apiError, setApiError] = useState<string | null>(null)
  const [isTriggering, setIsTriggering] = useState(true)
  const [triggerHandle, setTriggerHandle] = useState<{
    runId: string
    publicAccessToken: string
  } | null>(null)

  // Use the reusable trigger run hook
  const {
    isLoading: isRunLoading,
    isFailed,
    error: runError,
  } = useTriggerRun({
    runId: triggerHandle?.runId ?? null,
    publicAccessToken: triggerHandle?.publicAccessToken ?? null,
    showToast: false,
    onComplete: () => {
      // Navigate when completed
      router.push('/app')
    },
    onError: () => {
      // Error handling is done via the error state
    },
  })

  useEffect(() => {
    async function syncInstallation() {
      if (!installationId) {
        setApiError('Installation ID is required')
        setIsTriggering(false)
        return
      }

      try {
        const result = await trpc.org.syncInstallation.mutate({
          installationId,
        })

        if (!result.success || !result.triggerHandle) {
          setApiError('Failed to sync installation')
          setIsTriggering(false)
          return
        }

        // Set trigger handle to enable the hook
        setTriggerHandle({
          runId: result.triggerHandle.id,
          publicAccessToken: result.triggerHandle.publicAccessToken,
        })
        setIsTriggering(false)
      } catch (err) {
        console.error('Failed to sync installation:', err)
        setApiError(
          err instanceof Error ? err.message : 'Failed to sync installation',
        )
        setIsTriggering(false)
      }
    }

    void syncInstallation()
  }, [installationId, trpc])

  // Derive display state from hook values and local state
  const error =
    apiError ??
    (runError instanceof Error
      ? runError.message
      : runError
        ? String(runError)
        : null) ??
    (isFailed ? 'Installation sync failed' : null)
  const isLoading = isTriggering || isRunLoading

  return (
    <AppLayout>
      <div className="h-full w-full px-4 py-10 md:py-16 flex items-center justify-center">
        <Card className="w-full max-w-xl text-center">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">
              Setting up your GitHub App
            </CardTitle>
            <CardDescription>
              {isLoading
                ? 'Syncing your installation and memberships...'
                : error
                  ? 'An error occurred while setting up your installation.'
                  : 'Setup complete! Redirecting...'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="mt-4 flex items-center justify-center">
                {/* TODO: Add loading image here */}
                <div className="h-32 w-32 bg-muted animate-pulse rounded-lg" />
              </div>
            ) : error ? (
              <div className="mt-4 text-destructive">
                <p>{error}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Please try refreshing the page or contact support if the issue
                  persists.
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
