import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Tiptap } from './tiptap.js'

const meta = {
  title: 'Components/Tiptap Editor',
  component: Tiptap,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Tiptap>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const InContainer: Story = {
  render: () => (
    <div className="w-full max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Markdown Editor</h2>
      <p className="text-muted-foreground mb-4">
        A rich text editor powered by Tiptap. Supports markdown formatting
        including <strong>bold</strong>, <em>italic</em>, lists, and more.
      </p>
      <Tiptap />
    </div>
  ),
}

export const WithCustomWidth: Story = {
  render: () => (
    <div className="w-[600px]">
      <Tiptap />
    </div>
  ),
}

export const FullWidth: Story = {
  render: () => (
    <div className="w-full">
      <Tiptap />
    </div>
  ),
}

export const MultipleEditors: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-2">Editor 1</h3>
        <Tiptap />
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2">Editor 2</h3>
        <Tiptap />
      </div>
    </div>
  ),
}
