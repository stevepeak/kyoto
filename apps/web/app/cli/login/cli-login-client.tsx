'use client'

import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { signIn, useSession } from '@/lib/auth-client'

export function CliLoginClient(props: { state: string }) {
  const { data: session, isPending } = useSession()
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isPending) return
    if (session?.user?.id) {
      // Already authenticated on the web — continue to token minting.
      window.location.href = `/cli/callback?state=${encodeURIComponent(props.state)}`
      return
    }

    let cancelled = false
    void (async () => {
      setIsStarting(true)
      try {
        await signIn.social({
          provider: 'github',
          callbackURL: `/cli/callback?state=${encodeURIComponent(props.state)}`,
        })
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to start login')
          setIsStarting(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isPending, props.state, session?.user?.id])

  return (
    <div className="mx-auto max-w-md py-16 space-y-4">
      <h1 className="text-2xl font-semibold">Login for Kyoto CLI</h1>
      <p className="text-sm text-muted-foreground">
        This will open GitHub to authenticate, then return a session token back
        to your CLI.
      </p>

      {error ? (
        <div className="rounded-md border p-3 text-sm">
          <p className="font-medium">Something went wrong</p>
          <p className="text-muted-foreground mt-1">{error}</p>
        </div>
      ) : (
        <div className="rounded-md border p-3 text-sm text-muted-foreground">
          {isPending || isStarting
            ? 'Starting GitHub login…'
            : 'Preparing login…'}
        </div>
      )}

      {error ? (
        <Button
          onClick={() => {
            setError(null)
            setIsStarting(false)
            window.location.reload()
          }}
        >
          Retry
        </Button>
      ) : null}
    </div>
  )
}
