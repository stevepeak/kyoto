import { GitBranch, GitCommit, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Run, StatusDisplay } from '../types'

interface RunDetailTitleProps {
  commitTitle: string
  runStatusDescriptor: string
  relativeStarted: string
  absoluteStarted: string
  durationDisplay: string
  statusDisplay: StatusDisplay
  run: Run
  shortSha: string | null
  commitUrl: string | null
}

export function RunDetailTitle({
  commitTitle,
  runStatusDescriptor,
  relativeStarted,
  absoluteStarted,
  durationDisplay,
  statusDisplay,
  run,
  shortSha,
  commitUrl,
}: RunDetailTitleProps) {
  return (
    <div className="flex items-start gap-3">
      <statusDisplay.Icon
        className={cn(
          'size-14',
          statusDisplay.heroClassName,
          statusDisplay.shouldSpin ? 'animate-spin' : '',
        )}
      />
      <div className="flex-1">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold text-foreground md:text-2xl">
            {commitTitle}
          </h1>
          {/* Metadata: Time, Author, Branch, Commit */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Timer className="size-3.5" />
              <span className="flex items-center gap-1">
                {runStatusDescriptor}{' '}
                <time dateTime={absoluteStarted} title={absoluteStarted}>
                  {relativeStarted}
                </time>
                {durationDisplay !== '—' ? ` in ${durationDisplay}` : ''}
              </span>
            </span>
            {run.gitAuthor ? (
              <div className="flex items-center gap-2">
                <img
                  src={`https://avatars.githubusercontent.com/u/${run.gitAuthor.id}?v=4&s=32`}
                  alt={run.gitAuthor.name}
                  className="size-6 rounded-full"
                />
                <span className="text-foreground">
                  <strong>@{run.gitAuthor.login}</strong>
                </span>
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <GitBranch className="size-4 text-muted-foreground" />
              <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-mono font-medium text-blue-800">
                {run.branchName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <GitCommit className="size-4 text-muted-foreground" />
              {commitUrl ? (
                <a
                  href={commitUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs font-medium text-primary underline hover:text-primary/80"
                >
                  {shortSha ?? '—'}
                </a>
              ) : (
                <span className="font-mono text-xs font-medium text-foreground">
                  {shortSha ?? '—'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

