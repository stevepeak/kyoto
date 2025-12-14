'use client'

import { Github } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { signIn, useSession } from '@/lib/auth-client'

export function LoginClient(props: { redirectTo: string }) {
  const { data: session, isPending } = useSession()
  const [hasStartedSignIn, setHasStartedSignIn] = useState(false)
  const router = useRouter()
  const isSigningIn = isPending || hasStartedSignIn

  useEffect(() => {
    if (!isPending && session?.user?.id) {
      router.push(props.redirectTo)
    }
  }, [isPending, session?.user?.id, props.redirectTo, router])

  const handleSignIn = async () => {
    setHasStartedSignIn(true)
    await signIn.social({
      provider: 'github',
      callbackURL: props.redirectTo,
    })
  }

  return (
    <div className="flex min-h-svh items-center justify-center">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Sign in to Kyoto
          </h1>
          <p className="text-muted-foreground">
            Continue with your GitHub account
          </p>
        </div>
        <Button
          size="lg"
          disabled={isSigningIn}
          onClick={handleSignIn}
          className="min-w-48"
        >
          {isSigningIn ? (
            <>
              <Spinner />
              Signing in...
            </>
          ) : (
            <>
              <Github className="size-4" />
              Sign in with GitHub
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
