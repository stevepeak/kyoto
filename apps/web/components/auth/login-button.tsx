'use client'

import { FlaskConical, Github, LogOut, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

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
import { cn } from '@/lib/utils'

export function LoginButton() {
  const { data: session, isPending } = useSession()
  const [hasStartedSignIn, setHasStartedSignIn] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [showContent, setShowContent] = useState(false)
  const router = useRouter()
  const userLogin = session?.user ? getUserLogin(session.user) : null
  const isStevepeak = userLogin === 'stevepeak'
  // Only use isPending after mounted to prevent hydration mismatch
  const isSigningIn = mounted && (isPending || hasStartedSignIn)

  // Determine if we're still loading the auth state
  const isLoadingAuth = !mounted || isPending

  useEffect(() => {
    setMounted(true)
  }, [])

  // After auth loads, if no session, trigger the expansion animation
  useEffect(() => {
    if (mounted && !isPending && !session) {
      // Start expanding the circle into button shape
      const expandTimer = setTimeout(() => setExpanded(true), 50)
      // Show button content after shape has expanded
      const contentTimer = setTimeout(() => setShowContent(true), 350)
      return () => {
        clearTimeout(expandTimer)
        clearTimeout(contentTimer)
      }
    }
  }, [mounted, isPending, session])

  // Not logged in - show morphing animation from circle to button
  if (!session) {
    return (
      <button
        disabled={isSigningIn || !showContent}
        onClick={async () => {
          setHasStartedSignIn(true)
          await signIn.social({
            provider: 'github',
            callbackURL: '/',
          })
        }}
        style={{ borderRadius: expanded ? '6px' : '18px' }}
        className={cn(
          'relative h-9 overflow-hidden transition-all duration-500 ease-out',
          'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          'disabled:pointer-events-none',
          expanded
            ? 'w-[172px] bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
            : 'w-9 bg-muted',
        )}
      >
        {/* Pulse animation overlay for loading state */}
        <div
          className={cn(
            'absolute inset-0 bg-muted-foreground/10 transition-opacity duration-300',
            isLoadingAuth ? 'animate-pulse opacity-100' : 'opacity-0',
          )}
        />
        {/* Button content - fades in after expansion */}
        <div
          className={cn(
            'flex items-center gap-2 transition-opacity duration-200',
            showContent ? 'opacity-100' : 'opacity-0',
          )}
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
        </div>
      </button>
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
            router.push('/')
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
