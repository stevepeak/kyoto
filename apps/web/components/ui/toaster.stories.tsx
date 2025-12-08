import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { toast } from 'sonner'

import { Button } from './button.js'
import { Toaster } from './toaster.js'

const meta = {
  title: 'UI/Toaster',
  component: Toaster,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Toaster>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Button onClick={() => toast('This is a default toast')}>
        Show Toast
      </Button>
      <Toaster />
    </div>
  ),
}

export const Success: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Button
        onClick={() => toast.success('Operation completed successfully!')}
      >
        Show Success Toast
      </Button>
      <Toaster />
    </div>
  ),
}

export const Error: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Button
        variant="destructive"
        onClick={() => toast.error('Something went wrong!')}
      >
        Show Error Toast
      </Button>
      <Toaster />
    </div>
  ),
}

export const Loading: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Button onClick={() => toast.loading('Loading...')}>
        Show Loading Toast
      </Button>
      <Toaster />
    </div>
  ),
}

export const WithAction: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Button
        onClick={() =>
          toast('Event created', {
            action: {
              label: 'Undo',
              onClick: () => toast('Undo clicked'),
            },
          })
        }
      >
        Show Toast with Action
      </Button>
      <Toaster />
    </div>
  ),
}

export const PromiseToast: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Button
        onClick={() =>
          toast.promise(
            new Promise<void>((resolve) => setTimeout(resolve, 2000)),
            {
              loading: 'Processing...',
              success: 'Done!',
              error: 'Failed',
            },
          )
        }
      >
        Show Promise Toast
      </Button>
      <Toaster />
    </div>
  ),
}

export const AllTypes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => toast('Default message')}>Default</Button>
        <Button onClick={() => toast.success('Success message')}>
          Success
        </Button>
        <Button
          variant="destructive"
          onClick={() => toast.error('Error message')}
        >
          Error
        </Button>
        <Button onClick={() => toast.loading('Loading...')}>Loading</Button>
      </div>
      <Toaster />
    </div>
  ),
}
