import { type Meta, type StoryObj } from '@storybook/nextjs-vite'

import { RelativeTime } from './relative-time.js'

const meta = {
  title: 'Components/Relative Time',
  component: RelativeTime,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    date: {
      control: 'date',
      description: 'The date to show relative time from',
    },
    ago: {
      control: 'boolean',
      description:
        'Whether to show "ago" suffix for past or "in" prefix for future',
    },
    shorthand: {
      control: 'boolean',
      description:
        'Whether to use shorthand format (e.g., "25m" vs "25 minutes")',
    },
    className: {
      control: 'text',
      description: 'CSS classes to apply (caller-provided styles)',
    },
  },
} satisfies Meta<typeof RelativeTime>

export default meta
type Story = StoryObj<typeof meta>

// Helper to create dates relative to now
const now = Date.now()
const createDate = (msAgo: number) => new Date(now - msAgo)
const createFutureDate = (msAhead: number) => new Date(now + msAhead)

export const Default: Story = {
  args: {
    date: createDate(25 * 60 * 1000), // 25 minutes ago
    ago: true,
    shorthand: true,
  },
}

export const JustNow: Story = {
  args: {
    date: createDate(30 * 1000), // 30 seconds ago
    className: 'text-sm text-muted-foreground',
  },
}

export const MinutesAgo: Story = {
  args: {
    date: createDate(45 * 60 * 1000), // 45 minutes ago
    className: 'text-sm text-muted-foreground',
  },
}

export const HoursAgo: Story = {
  args: {
    date: createDate(3 * 60 * 60 * 1000), // 3 hours ago
    className: 'text-sm text-muted-foreground',
  },
}

export const DaysAgo: Story = {
  args: {
    date: createDate(5 * 24 * 60 * 60 * 1000), // 5 days ago
    className: 'text-sm text-muted-foreground',
  },
}

export const WeeksAgo: Story = {
  args: {
    date: createDate(2 * 7 * 24 * 60 * 60 * 1000), // 2 weeks ago
    className: 'text-sm text-muted-foreground',
  },
}

export const MonthsAgo: Story = {
  args: {
    date: createDate(6 * 30 * 24 * 60 * 60 * 1000), // ~6 months ago
    className: 'text-sm text-muted-foreground',
  },
}

export const YearsAgo: Story = {
  args: {
    date: createDate(2 * 365 * 24 * 60 * 60 * 1000), // ~2 years ago
    className: 'text-sm text-muted-foreground',
  },
}

export const MinutesAhead: Story = {
  args: {
    date: createFutureDate(25 * 60 * 1000), // 25 minutes from now
    className: 'text-sm text-muted-foreground',
  },
}

export const HoursAhead: Story = {
  args: {
    date: createFutureDate(3 * 60 * 60 * 1000), // 3 hours from now
    className: 'text-sm text-muted-foreground',
  },
}

export const DaysAhead: Story = {
  args: {
    date: createFutureDate(5 * 24 * 60 * 60 * 1000), // 5 days from now
    className: 'text-sm text-muted-foreground',
  },
}

export const WithoutAgo: Story = {
  args: {
    date: createDate(25 * 60 * 1000), // 25 minutes ago
    ago: false,
    shorthand: true,
    className: 'text-sm text-muted-foreground',
  },
}

export const WithoutAgoFuture: Story = {
  args: {
    date: createFutureDate(25 * 60 * 1000), // 25 minutes from now
    ago: false,
    shorthand: true,
    className: 'text-sm text-muted-foreground',
  },
}

export const LongFormat: Story = {
  args: {
    date: createDate(25 * 60 * 1000), // 25 minutes ago
    shorthand: false,
    className: 'text-sm text-muted-foreground',
  },
}

export const LongFormatFuture: Story = {
  args: {
    date: createFutureDate(3 * 60 * 60 * 1000), // 3 hours from now
    shorthand: false,
    className: 'text-sm text-muted-foreground',
  },
}

export const LongFormatWithoutAgo: Story = {
  args: {
    date: createDate(3 * 60 * 60 * 1000), // 3 hours ago
    ago: false,
    shorthand: false,
    className: 'text-sm text-muted-foreground',
  },
}

export const AllVariations: Story = {
  args: {
    date: new Date(),
  },
  render: () => {
    const pastDates = {
      justNow: createDate(30 * 1000),
      minutes: createDate(25 * 60 * 1000),
      hours: createDate(3 * 60 * 60 * 1000),
      days: createDate(5 * 24 * 60 * 60 * 1000),
      weeks: createDate(2 * 7 * 24 * 60 * 60 * 1000),
      months: createDate(6 * 30 * 24 * 60 * 60 * 1000),
      years: createDate(2 * 365 * 24 * 60 * 60 * 1000),
    }

    const futureDates = {
      minutes: createFutureDate(25 * 60 * 1000),
      hours: createFutureDate(3 * 60 * 60 * 1000),
      days: createFutureDate(5 * 24 * 60 * 60 * 1000),
    }

    return (
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Past (with "ago")</h3>
          <div className="flex flex-col gap-2 text-sm">
            <div>
              Just now:{' '}
              <RelativeTime
                date={pastDates.justNow}
                className="text-muted-foreground"
              />
            </div>
            <div>
              25 minutes:{' '}
              <RelativeTime
                date={pastDates.minutes}
                className="text-muted-foreground"
              />
            </div>
            <div>
              3 hours:{' '}
              <RelativeTime
                date={pastDates.hours}
                className="text-muted-foreground"
              />
            </div>
            <div>
              5 days:{' '}
              <RelativeTime
                date={pastDates.days}
                className="text-muted-foreground"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Future (with "in")</h3>
          <div className="flex flex-col gap-2 text-sm">
            <div>
              25 minutes:{' '}
              <RelativeTime
                date={futureDates.minutes}
                className="text-muted-foreground"
              />
            </div>
            <div>
              3 hours:{' '}
              <RelativeTime
                date={futureDates.hours}
                className="text-muted-foreground"
              />
            </div>
            <div>
              5 days:{' '}
              <RelativeTime
                date={futureDates.days}
                className="text-muted-foreground"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Past (without "ago")</h3>
          <div className="flex flex-col gap-2 text-sm">
            <div>
              25 minutes:{' '}
              <RelativeTime
                date={pastDates.minutes}
                ago={false}
                className="text-muted-foreground"
              />
            </div>
            <div>
              3 hours:{' '}
              <RelativeTime
                date={pastDates.hours}
                ago={false}
                className="text-muted-foreground"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Future (without "in")</h3>
          <div className="flex flex-col gap-2 text-sm">
            <div>
              25 minutes:{' '}
              <RelativeTime
                date={futureDates.minutes}
                ago={false}
                className="text-muted-foreground"
              />
            </div>
            <div>
              3 hours:{' '}
              <RelativeTime
                date={futureDates.hours}
                ago={false}
                className="text-muted-foreground"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Long format</h3>
          <div className="flex flex-col gap-2 text-sm">
            <div>
              Past 25 minutes:{' '}
              <RelativeTime
                date={pastDates.minutes}
                shorthand={false}
                className="text-muted-foreground"
              />
            </div>
            <div>
              Future 3 hours:{' '}
              <RelativeTime
                date={futureDates.hours}
                shorthand={false}
                className="text-muted-foreground"
              />
            </div>
          </div>
        </div>
      </div>
    )
  },
}
