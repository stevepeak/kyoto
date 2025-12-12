'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Github } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { signIn, useSession } from '@/lib/auth-client'

type AuthState =
  | { status: 'loading' }
  | { status: 'authenticating' }
  | { status: 'redirecting' }
  | { status: 'error'; message: string }

export default function CliAuthPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session, isPending } = useSession()
  const [authState, setAuthState] = useState<AuthState>({ status: 'loading' })

  const state = searchParams?.get('state')
  const port = searchParams?.get('port')

  useEffect(() => {
    async function handleAuth() {
      // Validate required params
      if (!state || !port) {
        setAuthState({
          status: 'error',
          message: 'Missing required parameters (state or port)',
        })
        return
      }

      // If loading session, wait
      if (isPending) {
        return
      }

      // If not authenticated, trigger GitHub OAuth
      if (!session) {
        setAuthState({ status: 'authenticating' })
        return
      }

      // User is authenticated, get the session token from API
      setAuthState({ status: 'redirecting' })

      try {
        // Call our API endpoint to get the session token
        const response = await fetch('/api/cli/session', {
          credentials: 'include', // Include cookies in the request
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(
            errorData.error || `HTTP ${response.status}: ${response.statusText}`,
          )
        }

        const data = await response.json()

        if (!data.token) {
          throw new Error('No session token returned from API')
        }

        // Redirect to CLI callback server with the token
        const callbackUrl = `http://localhost:${port}?state=${encodeURIComponent(state)}&token=${encodeURIComponent(data.token)}`

        // Use window.location for redirect to localhost
        window.location.href = callbackUrl
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'
        setAuthState({
          status: 'error',
          message: `Failed to complete authentication: ${errorMessage}`,
        })

        // Also send error to CLI
        const errorUrl = `http://localhost:${port}?state=${encodeURIComponent(state)}&error=${encodeURIComponent(errorMessage)}`
        window.location.href = errorUrl
      }
    }

    handleAuth()
  }, [session, isPending, state, port])

  // Handle manual GitHub sign in
  const handleSignIn = async () => {
    if (!state || !port) return

    try {
      setAuthState({ status: 'authenticating' })
      // Use the current URL as callback so we return here after OAuth
      const currentUrl = window.location.href
      await signIn.social({
        provider: 'github',
        callbackURL: currentUrl,
      })
    } catch (error) {
      setAuthState({
        status: 'error',
        message:
          error instanceof Error ? error.message : 'Failed to sign in',
      })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full mx-4">
        <div className="bg-card border rounded-lg shadow-lg p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Kyoto CLI Login</h1>
            <p className="text-muted-foreground">
              Authenticate your CLI with GitHub
            </p>
          </div>

          <div className="space-y-4">
            {authState.status === 'loading' && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                <p className="mt-4 text-muted-foreground">Loading...</p>
              </div>
            )}

            {authState.status === 'authenticating' && !session && (
              <div className="space-y-4">
                <p className="text-center text-muted-foreground">
                  Please sign in with GitHub to continue
                </p>
                <Button onClick={handleSignIn} className="w-full" size="lg">
                  <Github className="mr-2 h-5 w-5" />
                  Sign in with GitHub
                </Button>
              </div>
            )}

            {authState.status === 'redirecting' && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                <p className="mt-4 text-muted-foreground">
                  Redirecting to CLI...
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  You can close this window if it doesn&apos;t close
                  automatically
                </p>
              </div>
            )}

            {authState.status === 'error' && (
              <div className="space-y-4">
                <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
                  <p className="font-semibold">Authentication Error</p>
                  <p className="text-sm mt-1">{authState.message}</p>
                </div>
                <Button onClick={() => router.push('/')} variant="outline">
                  Return to Home
                </Button>
              </div>
            )}
          </div>

          <div className="pt-4 border-t text-center text-sm text-muted-foreground">
            <p>This page is used for CLI authentication only.</p>
            <p className="mt-1">
              If you&apos;re not using the Kyoto CLI,{' '}
              <a href="/" className="text-primary hover:underline">
                return to the home page
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
