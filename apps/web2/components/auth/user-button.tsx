'use client'

import { Button } from '@/components/ui/button'
import { signIn, signOut, useSession } from '@/lib/auth-client'

export function UserButton() {
  const { data: session, isPending } = useSession()

  if (isPending) {
    return <div className="h-9 w-32 animate-pulse bg-muted rounded-md" />
  }

  if (!session) {
    return (
      <Button
        onClick={async () => {
          await signIn.social({
            provider: 'github',
            callbackURL: '/',
          })
        }}
      >
        Sign in with GitHub
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        {session.user.image && (
          <img
            src={session.user.image}
            alt={session.user.name || 'User'}
            className="size-8 rounded-full border"
          />
        )}
        <span className="text-sm font-medium">
          {session.user.name || session.user.email}
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          await signOut()
        }}
      >
        Sign Out
      </Button>
    </div>
  )
}
