import { type Meta, type StoryObj } from '@storybook/nextjs-vite'
import {
  FlaskConical,
  Github,
  LogOut,
  Palette,
  RefreshCw,
  Settings,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

const meta = {
  title: 'Auth/LoginButton',
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// Avatar skeleton shown during loading (circle state)
function AvatarSkeletonDemo() {
  return (
    <div className="relative h-9 w-9 rounded-full bg-muted overflow-hidden">
      <div className="absolute inset-0 bg-muted-foreground/10 animate-pulse" />
    </div>
  )
}

// Mock component showing the circle-to-button morph animation (loops)
function LoadingTransitionDemo() {
  const [isLoading, setIsLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    let mounted = true

    const runCycle = () => {
      if (!mounted) return

      // Reset to loading state (circle)
      setIsLoading(true)
      setExpanded(false)
      setShowContent(false)

      // After 2s, finish loading and start expansion
      setTimeout(() => {
        if (!mounted) return
        setIsLoading(false)

        // Start expanding circle to button shape
        setTimeout(() => {
          if (!mounted) return
          setExpanded(true)

          // Show button content after shape has expanded
          setTimeout(() => {
            if (!mounted) return
            setShowContent(true)

            // Hold the button visible for 3s, then restart cycle
            setTimeout(() => {
              if (!mounted) return
              runCycle()
            }, 3000)
          }, 300)
        }, 50)
      }, 2000)
    }

    runCycle()

    return () => {
      mounted = false
    }
  }, [])

  return (
    <button
      disabled
      style={{ borderRadius: expanded ? '6px' : '18px' }}
      className={cn(
        'relative h-9 overflow-hidden transition-all duration-500 ease-out',
        'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium',
        expanded
          ? 'w-[172px] bg-primary text-primary-foreground shadow-sm'
          : 'w-9 bg-muted',
      )}
    >
      {/* Pulse animation overlay for loading state */}
      <div
        className={cn(
          'absolute inset-0 bg-muted-foreground/10 transition-opacity duration-300',
          isLoading ? 'animate-pulse opacity-100' : 'opacity-0',
        )}
      />
      {/* Button content - fades in after expansion */}
      <div
        className={cn(
          'flex items-center gap-2 transition-opacity duration-200',
          showContent ? 'opacity-100' : 'opacity-0',
        )}
      >
        <Github className="size-4" />
        Sign in with GitHub
      </div>
    </button>
  )
}

// Mock component showing the signed out state (fully expanded button)
function SignedOutDemo() {
  const [isLoading, setIsLoading] = useState(false)

  return (
    <Button
      disabled={isLoading}
      onClick={() => {
        setIsLoading(true)
        setTimeout(() => setIsLoading(false), 2000)
      }}
    >
      {isLoading ? (
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

// Mock component showing the signed in state
function SignedInDemo() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="cursor-pointer outline-none">
          <img
            src="https://avatars.githubusercontent.com/u/1234567?v=4"
            alt="John Doe"
            className="size-8 rounded-full border hover:opacity-80 transition-opacity"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* User info section */}
        <div className="px-2 py-2 border-b">
          <div className="flex items-center gap-3">
            <img
              src="https://avatars.githubusercontent.com/u/1234567?v=4"
              alt="John Doe"
              className="size-10 rounded-full border"
            />
            <div className="flex flex-col">
              <p className="text-sm font-medium">Steve Peak</p>
              <p className="text-xs text-muted-foreground">@stevepeak</p>
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
          }}
        >
          <LogOut className="size-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export const Loading: Story = {
  render: () => <AvatarSkeletonDemo />,
  parameters: {
    docs: {
      description: {
        story:
          'Shows an avatar skeleton while the authentication state is being determined.',
      },
    },
  },
}

export const LoadingTransition: Story = {
  render: () => <LoadingTransitionDemo />,
  parameters: {
    docs: {
      description: {
        story:
          'Demonstrates the transition from loading skeleton to sign-in button when user is not authenticated. The button fades in with a subtle slide animation.',
      },
    },
  },
}

export const SignedOut: Story = {
  render: () => <SignedOutDemo />,
  parameters: {
    docs: {
      description: {
        story:
          'Shows the sign-in button when no user is authenticated. Click to see the loading state during sign-in.',
      },
    },
  },
}

export const SignedIn: Story = {
  render: () => <SignedInDemo />,
  parameters: {
    docs: {
      description: {
        story:
          'Shows the user avatar when authenticated. Click to see the dropdown menu with account options.',
      },
    },
  },
}
