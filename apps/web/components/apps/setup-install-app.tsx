'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTriggerRun } from '@/hooks/use-trigger-run'
import { AppLayout } from '@/components/layout'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { z } from 'zod'

interface SetupInstallAppProps {
  installationId?: number
}

const syncResponseSchema = z.object({
  success: z.boolean(),
  triggerHandle: z
    .object({
      publicAccessToken: z.string(),
      id: z.string(),
    })
    .optional(),
  installationId: z.number().optional(),
  error: z.string().optional(),
})

export function SetupInstallApp({ installationId }: SetupInstallAppProps) {
  const router = useRouter()
  const [apiError, setApiError] = useState<string | null>(null)
  const [isTriggering, setIsTriggering] = useState(true)
  const [runId, setRunId] = useState<string | null>(null)
  const [publicAccessToken, setPublicAccessToken] = useState<string | null>(
    null,
  )

  // Use the reusable trigger run hook
  const { isLoading: isRunLoading, isFailed, error: runError } = useTriggerRun(
    {
      runId,
      publicAccessToken,
      enabled: runId !== null && publicAccessToken !== null,
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
        const response = await fetch('/api/github/app/sync-installation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            installation_id: installationId,
          }),
        })

        const data = syncResponseSchema.parse(await response.json())

        if (!data.success) {
          setApiError(data.error ?? 'Failed to sync installation')
          setIsTriggering(false)
          return
        }

        if (!data.triggerHandle) {
          setApiError('Missing trigger handle')
          setIsTriggering(false)
          return
        }

        // Set runId and token to enable the hook
        setRunId(data.triggerHandle.id)
        setPublicAccessToken(data.triggerHandle.publicAccessToken)
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
  }, [installationId])

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
