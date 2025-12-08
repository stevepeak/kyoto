import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Kanji } from './kanji.js'

const meta = {
  title: 'Components/Kanji',
  component: Kanji,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'English translation or explanation tooltip',
    },
    children: {
      control: 'text',
      description: 'The Japanese text (kanji, hiragana, or katakana)',
    },
  },
} satisfies Meta<typeof Kanji>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    title: 'Sakusei - to create.',
    children: 'さくせい',
  },
}
