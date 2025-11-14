import { cn } from '@/lib/utils'

type StoryStatus = 'pass' | 'fail' | 'error' | 'running' | null

type StoryStatusKey = Exclude<StoryStatus, null> | 'not_run'

interface StoryCardProps {
  id: string
  name: string
  href: string
  groups: string[]
  latestStatus: StoryStatus
}

const STATUS_META: Record<
  StoryStatusKey,
  {
    label: string
    textClass: string
    dotClass: string
  }
> = {
  pass: {
    label: 'Passing',
    textClass: 'text-chart-1',
    dotClass: 'bg-chart-1',
  },
  fail: {
    label: 'Failing',
    textClass: 'text-destructive',
    dotClass: 'bg-destructive',
  },
  error: {
    label: 'Error',
    textClass: 'text-chart-4',
    dotClass: 'bg-chart-4',
  },
  running: {
    label: 'Running',
    textClass: 'text-primary',
    dotClass: 'bg-primary',
  },
  not_run: {
    label: 'Not run yet',
    textClass: 'text-muted-foreground',
    dotClass: 'bg-muted-foreground',
  },
}

export function StoryCard({
  id: _id,
  name,
  href,
  groups,
  latestStatus,
}: StoryCardProps) {
  const statusKey: StoryStatusKey = latestStatus ?? 'not_run'
  const statusDisplay = STATUS_META[statusKey]
  
  // Check if story is being processed (title is missing or placeholder)
  const isProcessing = !name || name.trim() === '' || name.trim() === 'foobar'
  const displayName = isProcessing
    ? 'Newly crafted story is being processed...'
    : name

  return (
    <a
      href={href}
      className="block px-4 py-3 text-sm transition-colors hover:bg-muted"
    >
      <div className="flex flex-col gap-2">
        <span
          className={cn(
            'font-medium line-clamp-1',
            isProcessing
              ? 'text-muted-foreground italic'
              : 'text-foreground',
          )}
        >
          {displayName}
        </span>
        <div className="flex items-center gap-2 text-xs">
          <span
            className={cn(
              'inline-flex items-center gap-1 font-medium',
              statusDisplay.textClass,
            )}
          >
            <span
              className={cn('h-2 w-2 rounded-full', statusDisplay.dotClass)}
            />
            {statusDisplay.label}
          </span>
        </div>
        {groups.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {groups.map((group) => (
              <span
                key={group}
                className="inline-flex items-center rounded-full bg-primary/10 px-2 py-[3px] text-[10px] font-medium text-primary"
              >
                {group}
              </span>
            ))}
          </div>
        )}
      </div>
    </a>
  )
}
