'use client'

import { CalendarClock, Video } from 'lucide-react'

import type { BrowserAgentRun } from '@app/schemas'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

import { getDisplayStatus, RunStatusIcon } from './run-status-utils'

type RunSidebarProps = {
  runs: BrowserAgentRun[]
  isLoading: boolean
  selectedRunId: string | null
  nextScheduledRun: Date | null
  onRunSelect: (runId: string) => void
}

export function RunSidebar({
  runs,
  isLoading,
  selectedRunId,
  nextScheduledRun,
  onRunSelect,
}: RunSidebarProps) {
  return (
    <div className="w-80 flex-shrink-0 overflow-auto border-l bg-muted/20 p-4">
      <h3 className="mb-4 text-sm font-semibold">Run History</h3>
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-3">
          {/* Upcoming scheduled run */}
          {nextScheduledRun && (
            <Card className="border-dashed border-primary/50 bg-primary/5 py-3">
              <CardHeader className="px-3 py-0">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <CalendarClock className="size-4 text-primary" />
                  <span>Scheduled</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 py-0">
                <div className="text-xs text-muted-foreground">
                  {nextScheduledRun.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Past runs */}
          {runs.length === 0 && !nextScheduledRun ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No runs yet
            </div>
          ) : (
            runs.map((run) => {
              const displayStatus = getDisplayStatus(run)
              return (
                <Card
                  key={run.id}
                  className={cn(
                    'cursor-pointer py-3 transition-colors hover:bg-accent/50',
                    selectedRunId === run.id && 'ring-2 ring-primary',
                  )}
                  onClick={() => onRunSelect(run.id)}
                >
                  <CardHeader className="px-3 py-0">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <RunStatusIcon status={displayStatus.status} />
                      <span>{displayStatus.label}</span>
                      {run.sessionId && (
                        <Video className="ml-auto size-3 text-muted-foreground" />
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 py-0">
                    <div className="text-xs text-muted-foreground">
                      {new Date(run.createdAt).toLocaleString()}
                    </div>
                    {run.error && (
                      <div className="mt-2 truncate text-xs text-destructive">
                        {run.error}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
