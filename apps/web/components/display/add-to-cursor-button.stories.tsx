import { type Meta, type StoryObj } from '@storybook/nextjs-vite'

import { AddToCursorButton } from './add-to-cursor-button.js'

const meta = {
  title: 'Components/Add to Cursor Button',
  component: AddToCursorButton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'default',
        'destructive',
        'outline',
        'secondary',
        'ghost',
        'link',
      ],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
    disabled: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof AddToCursorButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    variant: 'outline',
    size: 'default',
  },
}

export const Small: Story = {
  args: {
    variant: 'outline',
    size: 'sm',
  },
}

export const Large: Story = {
  args: {
    variant: 'outline',
    size: 'lg',
  },
}

export const Disabled: Story = {
  args: {
    variant: 'outline',
    disabled: true,
  },
}

export const DefaultVariant: Story = {
  args: {
    variant: 'default',
  },
}

export const SecondaryVariant: Story = {
  args: {
    variant: 'secondary',
  },
}

export const GhostVariant: Story = {
  args: {
    variant: 'ghost',
  },
}

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <AddToCursorButton variant="default" />
        <AddToCursorButton variant="outline" />
        <AddToCursorButton variant="secondary" />
        <AddToCursorButton variant="ghost" />
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <AddToCursorButton size="sm" />
        <AddToCursorButton size="default" />
        <AddToCursorButton size="lg" />
      </div>
      <div className="flex flex-wrap gap-2">
        <AddToCursorButton />
        <AddToCursorButton disabled />
      </div>
    </div>
  ),
}
