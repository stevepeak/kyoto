'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function RepoError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Repository page error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">
          Failed to load repository
        </h1>
        <p className="text-muted-foreground">
          {error.message || 'Unable to load repository data'}
        </p>
        <div className="flex gap-2 justify-center">
          <Button onClick={reset} variant="default">
            Try again
          </Button>
          <Button onClick={() => window.history.back()} variant="outline">
            Go back
          </Button>
        </div>
      </div>
    </div>
  )
}
