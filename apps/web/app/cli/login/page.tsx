'use client'

import { useSearchParams } from 'next/navigation'
import React, { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { signIn } from '@/lib/auth-client'

export default function CliLoginPage(): React.ReactElement {
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)

  const loginId = searchParams.get('loginId') ?? ''
  const browserToken = searchParams.get('browserToken') ?? ''

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!loginId || !browserToken) return
    try {
      window.sessionStorage.setItem('kyoto_cli_loginId', loginId)
      window.sessionStorage.setItem('kyoto_cli_browserToken', browserToken)
    } catch {
      // ignore
    }
  }, [loginId, browserToken])

  const callbackURL = useMemo(() => {
    if (typeof window === 'undefined') {
      return '/cli/login/complete'
    }
    const url = new URL('/cli/login/complete', window.location.origin)
    url.searchParams.set('loginId', loginId)
    url.searchParams.set('browserToken', browserToken)
    return url.pathname + url.search
  }, [loginId, browserToken])

  const canContinue = Boolean(loginId && browserToken)

  return (
    <main className="container mx-auto min-h-screen py-12">
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="text-2xl font-semibold">Kyoto CLI Login</h1>
        <p className="text-muted-foreground">
          Continue with GitHub to finish logging in to the Kyoto CLI.
        </p>

        {!canContinue ? (
          <div className="rounded-md border p-4 text-sm">
            Missing login parameters. Please restart the login flow from the CLI.
          </div>
        ) : (
          <Button
            disabled={isLoading}
            onClick={async () => {
              setIsLoading(true)
              try {
                await signIn.social({
                  provider: 'github',
                  callbackURL,
                })
              } finally {
                setIsLoading(false)
              }
            }}
          >
            {isLoading ? 'Redirecting to GitHub…' : 'Continue with GitHub'}
          </Button>
        )}
      </div>
    </main>
  )
}

