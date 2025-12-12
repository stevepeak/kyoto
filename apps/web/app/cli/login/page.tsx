'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import { signIn } from '@/lib/auth-client'

/**
 * CLI Login page
 * This page is opened by the CLI to initiate the GitHub OAuth flow
 * The state parameter is used to track the CLI session
 */
export default function CliLoginPage() {
  const searchParams = useSearchParams()
  const state = searchParams.get('state')
  const [status, setStatus] = useState<'validating' | 'redirecting' | 'error'>(
    'validating',
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const initiateLogin = async () => {
      if (!state) {
        setStatus('error')
        setErrorMessage('Missing state parameter')
        return
      }

      try {
        // Register this CLI session with the server
        const response = await fetch('/api/cli/init', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ state }),
        })

        if (!response.ok) {
          throw new Error('Failed to initialize CLI session')
        }

        setStatus('redirecting')

        // Initiate GitHub OAuth with the state parameter
        // Better-auth will handle the OAuth flow and redirect back
        await signIn.social({
          provider: 'github',
          callbackURL: `/cli/callback?state=${state}`,
        })
      } catch (error) {
        setStatus('error')
        setErrorMessage(
          error instanceof Error ? error.message : 'Unknown error occurred',
        )
      }
    }

    void initiateLogin()
  }, [state])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 rounded-lg border border-border bg-card p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Kyoto CLI Login</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Authenticating with GitHub
          </p>
        </div>

        <div className="space-y-4">
          {status === 'validating' && (
            <div className="flex items-center justify-center space-x-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm">Validating session...</p>
            </div>
          )}

          {status === 'redirecting' && (
            <div className="flex items-center justify-center space-x-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm">Redirecting to GitHub...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-2">
              <div className="rounded-md bg-destructive/10 p-4 text-destructive">
                <p className="font-medium">Authentication Error</p>
                {errorMessage && <p className="mt-1 text-sm">{errorMessage}</p>}
              </div>
              <p className="text-sm text-muted-foreground">
                Please close this window and try again from the CLI.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
