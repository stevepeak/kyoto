'use client'

import { useSession } from '@/client/auth-client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SignedInBannerProps {
  className?: string
}

export default function SignedInBanner({ className }: SignedInBannerProps) {
  const session = useSession()

  if (!session.data || session.isPending || session.error) {
    return null
  }

  const displayName =
    session.data.user.email ?? session.data.user.name ?? 'your account'

  return (
    <div
      className={cn(
        'w-full border-b border-primary/20 bg-primary/10',
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-3 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-wide text-primary">
            Welcome back {displayName} 🌸
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <a href="/app">Enter ⛩️ Kyoto</a>
        </Button>
      </div>
    </div>
  )
}
