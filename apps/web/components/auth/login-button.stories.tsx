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

const meta = {
  title: 'Auth/LoginButton',
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// Mock component showing the checking auth state
function CheckingAuthDemo() {
  return (
    <Button disabled>
      <Spinner />
      Signing in...
    </Button>
  )
}

// Mock component showing the signed out state
function SignedOutDemo() {
  const [isLoading, setIsLoading] = useState(false)

  return (
    <Button
      disabled={isLoading}
      onClick={async () => {
        setIsLoading(true)
        setTimeout(() => setIsLoading(false), 2000)
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

export const SignedOut: Story = {
  render: () => <SignedOutDemo />,
  parameters: {
    docs: {
      description: {
        story:
          'Shows the sign-in button when no user is authenticated. Click to see the loading state.',
      },
    },
  },
}

export const Loading: Story = {
  render: () => <CheckingAuthDemo />,
  parameters: {
    docs: {
      description: {
        story:
          'Shows a loading skeleton while the authentication state is being determined.',
      },
    },
  },
}
