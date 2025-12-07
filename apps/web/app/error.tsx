'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Send error to Sentry with full traceback
    Sentry.captureException(error, {
      tags: {
        errorBoundary: true,
        digest: error.digest,
      },
    })
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">
          Something went wrong!
        </h1>
        <p className="text-muted-foreground">
          {error.message || 'An unexpected error occurred'}
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex gap-2 justify-center">
          <Button onClick={reset} variant="default">
            Try again
          </Button>
          <Button
            onClick={() => (window.location.href = '/')}
            variant="outline"
          >
            Go home
          </Button>
        </div>
      </div>
    </div>
  )
}
