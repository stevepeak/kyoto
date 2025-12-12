import { CheckCircle2 } from 'lucide-react'

/**
 * CLI login success page
 * Shows after successful authentication
 */
export default async function CliSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ login?: string }>
}) {
  const params = await searchParams
  const login = params.login || 'User'

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 rounded-lg border border-border bg-card p-8 shadow-lg">
        <div className="flex flex-col items-center space-y-4 text-center">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
          <h1 className="text-2xl font-bold">Authentication Successful!</h1>
          <p className="text-muted-foreground">
            Welcome back, <span className="font-medium">{login}</span>
          </p>
        </div>

        <div className="space-y-4 rounded-md bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground">
            You have successfully authenticated with GitHub. Your CLI session is
            now active.
          </p>
          <div className="border-l-2 border-primary pl-4">
            <p className="text-sm font-medium">Next steps:</p>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-muted-foreground">
              <li>Return to your terminal</li>
              <li>Start using Kyoto CLI commands</li>
            </ol>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            You can safely close this window
          </p>
        </div>
      </div>
    </div>
  )
}
