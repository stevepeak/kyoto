import { type Meta, type StoryObj } from '@storybook/nextjs-vite'
import { Github } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'

const meta = {
  title: 'Auth/LoginButton',
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

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
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <img
          src="https://avatars.githubusercontent.com/u/1234567?v=4"
          alt="John Doe"
          className="size-8 rounded-full border"
        />
        <span className="text-sm font-medium">John Doe</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          // eslint-disable-next-line no-console
          console.log('Sign out clicked')
        }}
      >
        Sign Out
      </Button>
    </div>
  )
}

export const CheckingAuth: Story = {
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

export const SignedIn: Story = {
  render: () => <SignedInDemo />,
  parameters: {
    docs: {
      description: {
        story:
          'Shows the user information and sign-out button when authenticated.',
      },
    },
  },
}
