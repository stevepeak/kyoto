import { XCircle } from 'lucide-react'

/**
 * CLI login error page
 * Shows when authentication fails
 */
export default async function CliErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const params = await searchParams
  const message = params.message || 'An unknown error occurred'

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 rounded-lg border border-border bg-card p-8 shadow-lg">
        <div className="flex flex-col items-center space-y-4 text-center">
          <XCircle className="h-16 w-16 text-destructive" />
          <h1 className="text-2xl font-bold">Authentication Failed</h1>
          <p className="text-muted-foreground">{message}</p>
        </div>

        <div className="space-y-4 rounded-md bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground">
            Something went wrong during the authentication process.
          </p>
          <div className="border-l-2 border-destructive pl-4">
            <p className="text-sm font-medium">What to do next:</p>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-muted-foreground">
              <li>Close this window</li>
              <li>Return to your terminal</li>
              <li>
                Run <code className="rounded bg-muted px-1">kyoto login</code>{' '}
                again
              </li>
            </ol>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            If the problem persists, please contact support
          </p>
        </div>
      </div>
    </div>
  )
}
