'use client'

import { Github } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { signIn, useSession } from '@/lib/auth-client'

function Spinner() {
  return (
    <svg
      className="animate-spin size-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

export function LoginButton() {
  const { data: session, isPending } = useSession()
  const [isLoading, setIsLoading] = useState(false)

  if (isPending) {
    return (
      <Button disabled>
        <Spinner />
        Signing in...
      </Button>
    )
  }

  if (!session) {
    return (
      <Button
        disabled={isLoading}
        onClick={async () => {
          setIsLoading(true)
          try {
            await signIn.social({
              provider: 'github',
              callbackURL: '/',
            })
          } finally {
            setIsLoading(false)
          }
        }}
      >
        {isLoading ? (
          <>
            <Spinner />
            Logging in with GitHub...
          </>
        ) : (
          <>
            <Github className="size-4" />
            Sign in with GitHub
          </>
        )}
      </Button>
    )
  }

  return (
    <div className="flex items-center">
      {session.user.image && (
        <img
          src={session.user.image}
          alt={session.user.name || 'User'}
          className="size-8 rounded-full border"
        />
      )}
    </div>
  )
}
