import { type Meta, type StoryObj } from '@storybook/nextjs-vite'
import { Sparkles, Stars, Wand2, Zap } from 'lucide-react'

import { ShimmerButton } from './shimmer-button.js'

const meta = {
  title: 'Components/Shimmer Button',
  component: ShimmerButton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'outline', 'secondary', 'ghost'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg'],
    },
    disabled: {
      control: 'boolean',
    },
    isLoading: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof ShimmerButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: 'Shimmer Button',
  },
}

export const WithIcon: Story = {
  args: {
    icon: Sparkles,
    children: 'Generate',
  },
}

export const Loading: Story = {
  args: {
    icon: Sparkles,
    children: 'Generate',
    isLoading: true,
    loadingText: 'Generating...',
  },
}

export const Disabled: Story = {
  args: {
    icon: Sparkles,
    children: 'Generate',
    disabled: true,
  },
}

export const Small: Story = {
  args: {
    icon: Wand2,
    children: 'Magic',
    size: 'sm',
  },
}

export const Large: Story = {
  args: {
    icon: Zap,
    children: 'Power Up',
    size: 'lg',
  },
}

export const DefaultVariant: Story = {
  args: {
    icon: Stars,
    children: 'Default Style',
    variant: 'default',
  },
}

export const SecondaryVariant: Story = {
  args: {
    icon: Sparkles,
    children: 'Secondary Style',
    variant: 'secondary',
  },
}

export const AllStates: Story = {
  args: {
    children: '',
  },
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <ShimmerButton icon={Sparkles}>Default</ShimmerButton>
        <ShimmerButton icon={Sparkles} isLoading loadingText="Loading...">
          Loading
        </ShimmerButton>
        <ShimmerButton icon={Sparkles} disabled>
          Disabled
        </ShimmerButton>
      </div>
      <div className="flex flex-wrap gap-4 items-center">
        <ShimmerButton icon={Wand2} size="sm">
          Small
        </ShimmerButton>
        <ShimmerButton icon={Sparkles} size="default">
          Default
        </ShimmerButton>
        <ShimmerButton icon={Zap} size="lg">
          Large
        </ShimmerButton>
      </div>
      <div className="flex flex-wrap gap-4">
        <ShimmerButton icon={Sparkles} variant="outline">
          Outline
        </ShimmerButton>
        <ShimmerButton icon={Stars} variant="default">
          Default
        </ShimmerButton>
        <ShimmerButton icon={Wand2} variant="secondary">
          Secondary
        </ShimmerButton>
      </div>
    </div>
  ),
}

export const InteractiveDemo: Story = {
  args: {
    children: '',
  },
  render: () => (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <h3 className="text-lg font-semibold mb-3">Use Cases</h3>
        <div className="flex flex-wrap gap-3">
          <ShimmerButton icon={Sparkles}>Generate with AI</ShimmerButton>
          <ShimmerButton icon={Wand2}>Auto-Complete</ShimmerButton>
          <ShimmerButton icon={Zap}>Quick Action</ShimmerButton>
          <ShimmerButton icon={Stars}>Enhance</ShimmerButton>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-3">Loading States</h3>
        <div className="flex flex-wrap gap-3">
          <ShimmerButton icon={Sparkles} isLoading loadingText="Generating...">
            Generate
          </ShimmerButton>
          <ShimmerButton icon={Wand2} isLoading loadingText="Processing...">
            Process
          </ShimmerButton>
        </div>
      </div>
    </div>
  ),
}
