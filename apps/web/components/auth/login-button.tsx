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
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'
import { signIn, signOut, useSession } from '@/lib/auth-client'
import { getUserLogin } from '@/lib/auth-utils'

export function LoginButton() {
  const { data: session, isPending } = useSession()
  const [hasStartedSignIn, setHasStartedSignIn] = useState(false)
  const router = useRouter()
  const userLogin = session?.user ? getUserLogin(session.user) : null
  const isStevepeak = userLogin === 'stevepeak'
  const isSigningIn = isPending || hasStartedSignIn

  if (!session) {
    return (
      <Button
        disabled={isSigningIn}
        onClick={async () => {
          // NOTE: `signIn.social()` can resolve before session loading starts (redirect/popup flow).
          // Keep the button disabled from the first click to avoid a brief "enabled" flash.
          setHasStartedSignIn(true)
          await signIn.social({
            provider: 'github',
            callbackURL: '/',
          })
        }}
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

        {/* <DropdownMenuSeparator /> */}

        {/* Teams */}
        {/* <DropdownMenuItem
          onClick={() => {
            router.push('/~')
          }}
        >
          <Users className="size-4" />
          <span>Teams</span>
        </DropdownMenuItem> */}

        {/* Development */}
        {isStevepeak && (
          <DropdownMenuItem
            onClick={() => {
              router.push('/development')
            }}
          >
            <FlaskConical className="size-4" />
            <span>Development</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* Settings */}
        {/* <DropdownMenuItem
          onClick={() => {
            // eslint-disable-next-line no-console
            console.log('Settings clicked')
          }}
        >
          <Settings className="size-4" />
          <span>Settings</span>
        </DropdownMenuItem> */}

        {/* Feature Preview */}
        {/* <DropdownMenuItem
          onClick={() => {
            // eslint-disable-next-line no-console
            console.log('Feature Preview clicked')
          }}
        >
          <FlaskConical className="size-4" />
          <span>Feature preview</span>
        </DropdownMenuItem> */}

        {/* Appearance */}
        {/* <DropdownMenuItem
          onClick={() => {
            // eslint-disable-next-line no-console
            console.log('Appearance clicked')
          }}
        >
          <Palette className="size-4" />
          <span>Appearance</span>
        </DropdownMenuItem> */}

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
