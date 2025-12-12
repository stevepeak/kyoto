'use client'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { signIn } from '@/lib/auth-client'
import { Github, Loader2, Terminal } from 'lucide-react'
import { useState } from 'react'

interface CliLoginClientProps {
  state: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  session: any
}

export function CliLoginClient({ state, session }: CliLoginClientProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleApprove = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/cli/code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ state }),
      })

      if (!res.ok) {
        throw new Error('Failed to approve login')
      }

      setIsSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignIn = async () => {
    setIsLoading(true)
    try {
      await signIn.social({
        provider: 'github',
        callbackURL: `/cli/login?state=${state}`,
      })
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err)
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-green-600">
            Login Approved
          </CardTitle>
          <CardDescription className="text-center">
            You can now close this tab and return to the CLI.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex justify-center mb-4">
          <Terminal className="h-12 w-12 text-primary" />
        </div>
        <CardTitle className="text-center">CLI Login Request</CardTitle>
        <CardDescription className="text-center">
          {session
            ? `Logged in as ${session.user.name}`
            : 'Please log in to approve this CLI session'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md text-center">
            {error}
          </div>
        )}

        {session ? (
          <Button
            className="w-full"
            onClick={handleApprove}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Approve Login
          </Button>
        ) : (
          <Button
            className="w-full"
            onClick={handleSignIn}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Github className="mr-2 h-4 w-4" />
            )}
            Sign in with GitHub
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
