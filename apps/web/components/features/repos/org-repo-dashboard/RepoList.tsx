'use client'

import { useMemo } from 'react'
import { Clock3 } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from './utils/formatRelativeTime'
import { formatStoryCount } from './utils/formatStoryCount'

interface RepoItem {
  id: string
  name: string
  defaultBranch?: string
  isPrivate: boolean
  storyCount: number
  lastRunStatus: 'pass' | 'fail' | 'skipped' | 'running' | 'error' | null
  lastRunAt: Date | null
}

interface OrgData {
  id: string
  slug: string
  name: string
}

interface Props {
  org: OrgData | null
  repos: RepoItem[]
  onOpenDialog: () => void
}

const statusConfig: Record<
  NonNullable<RepoItem['lastRunStatus']>,
  {
    label: string
    dotClass: string
  }
> = {
  pass: {
    label: 'Passed',
    dotClass: 'bg-chart-1',
  },
  fail: {
    label: 'Failed',
    dotClass: 'bg-destructive',
  },
  skipped: {
    label: 'Skipped',
    dotClass: 'bg-muted-foreground',
  },
  running: {
    label: 'Running',
    dotClass: 'bg-primary',
  },
  error: {
    label: 'Error',
    dotClass: 'bg-orange-500',
  },
}

export function RepoList({ org, repos, onOpenDialog }: Props) {
  const displayedRepos = useMemo(() => {
    return [...repos].sort((a, b) => a.name.localeCompare(b.name))
  }, [repos])

  if (repos.length === 0) {
    return (
      <EmptyState
        kanji="せつぞく"
        kanjiTitle="Setsuzoku - to connect."
        title="Connect your first repository"
        description="Enable your first repository to start tracking stories, CI runs, and more. Connect a repository to begin monitoring your codebase and ensuring it aligns with your requirements."
        action={
          <Button onClick={onOpenDialog} size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            <span>Connect Repository</span>
          </Button>
        }
      />
    )
  }

  if (displayedRepos.length === 0) {
    return (
      <EmptyState
        title="No repositories match your search"
        description="Try adjusting your filters or clear the search to view all repositories."
      />
    )
  }

  return (
    <ul className="overflow-hidden rounded-lg border border-border bg-card">
      {displayedRepos.map((repo) => {
        const statusMeta = repo.lastRunStatus
          ? statusConfig[repo.lastRunStatus]
          : null
        const relativeTime = formatRelativeTime(repo.lastRunAt)

        return (
          <li key={repo.id} className="border-b border-border last:border-b-0">
            <a
              href={`/org/${org?.slug}/repo/${repo.name}`}
              className="block px-6 py-5 cursor-pointer"
            >
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-semibold text-primary">
                    {repo.name}
                  </span>
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {repo.isPrivate ? 'Private' : 'Public'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span>{formatStoryCount(repo.storyCount)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusMeta ? (
                      <>
                        <span
                          className={cn(
                            'h-2 w-2 rounded-full',
                            statusMeta.dotClass,
                          )}
                        />
                        <span className="text-muted-foreground">
                          Last CI run {statusMeta.label.toLowerCase()}
                          {relativeTime ? ` • ${relativeTime}` : ''}
                        </span>
                      </>
                    ) : (
                      <>
                        <Clock3 className="h-4 w-4 text-muted-foreground" />
                        <span>No CI runs yet</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </a>
          </li>
        )
      })}
    </ul>
  )
}
