'use client'

import {
  FlaskConical,
  Github,
  LogOut,
  Palette,
  RefreshCw,
  Settings,
  Users,
} from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { signIn, signOut, useSession } from '@/lib/auth-client'
import { getUserLogin } from '@/lib/auth-utils'

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="cursor-pointer outline-none">
          {session.user.image && (
            <img
              src={session.user.image}
              alt={session.user.name || 'User'}
              className="size-8 rounded-full border hover:opacity-80 transition-opacity"
            />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* User info section */}
        <div className="px-2 py-2 border-b">
          <div className="flex items-center gap-3">
            {session.user.image && (
              <img
                src={session.user.image}
                alt={session.user.name}
                className="size-10 rounded-full border"
              />
            )}
            <div className="flex flex-col">
              <p className="text-sm font-medium">{session.user.name}</p>
              <p className="text-xs text-muted-foreground">
                @{getUserLogin(session.user)}
              </p>
            </div>
          </div>
        </div>

        {/* Swap account - disabled */}
        <DropdownMenuItem
          disabled
          className="cursor-not-allowed opacity-50"
          onClick={() => {
            // eslint-disable-next-line no-console
            console.log('Swap account (coming soon)')
          }}
        >
          <RefreshCw className="size-4" />
          <span>Swap account</span>
          <span className="ml-auto text-xs text-muted-foreground">
            Coming soon
          </span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Teams */}
        <DropdownMenuItem
          onClick={() => {
            // eslint-disable-next-line no-console
            console.log('Teams clicked')
          }}
        >
          <Users className="size-4" />
          <span>Teams</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Settings */}
        <DropdownMenuItem
          onClick={() => {
            // eslint-disable-next-line no-console
            console.log('Settings clicked')
          }}
        >
          <Settings className="size-4" />
          <span>Settings</span>
        </DropdownMenuItem>

        {/* Feature Preview */}
        <DropdownMenuItem
          onClick={() => {
            // eslint-disable-next-line no-console
            console.log('Feature Preview clicked')
          }}
        >
          <FlaskConical className="size-4" />
          <span>Feature preview</span>
        </DropdownMenuItem>

        {/* Appearance */}
        <DropdownMenuItem
          onClick={() => {
            // eslint-disable-next-line no-console
            console.log('Appearance clicked')
          }}
        >
          <Palette className="size-4" />
          <span>Appearance</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Sign Out */}
        <DropdownMenuItem
          onClick={async () => {
            // eslint-disable-next-line no-console
            console.log('Sign out clicked')
            await signOut()
          }}
        >
          <LogOut className="size-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
