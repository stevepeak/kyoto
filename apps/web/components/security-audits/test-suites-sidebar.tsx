'use client'

import { CheckCircle, Clock, Loader2, Play, XCircle } from 'lucide-react'
import { type ChangeEvent } from 'react'

import { RelativeTime } from '@/components/display/relative-time'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

type TestSuite = {
  id: string
  name: string
  status: 'completed' | 'running' | 'failed' | 'pending'
  createdAt: Date
  score?: string
}

type TestSuitesSidebarProps = {
  testSuites: TestSuite[]
  selectedTestSuiteId: string | null
  onTestSuiteSelect: (id: string) => void
  isLoading: boolean
  auditId: string | null
  onTriggerRun: () => void
  isTriggering: boolean
  scheduleText: string
  cronSchedule: string
  isParsing: boolean
  parseError: string | null
  onScheduleTextChange: (e: ChangeEvent<HTMLInputElement>) => void
  onScheduleBlur: () => void
}

function getStatusIcon(status: TestSuite['status']) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="size-4 text-green-500" />
    case 'failed':
      return <XCircle className="size-4 text-destructive" />
    case 'running':
      return <Clock className="size-4 text-blue-500 animate-spin" />
    case 'pending':
      return <Clock className="size-4 text-muted-foreground" />
  }
}

function getStatusLabel(status: TestSuite['status']) {
  switch (status) {
    case 'completed':
      return 'Completed'
    case 'failed':
      return 'Failed'
    case 'running':
      return 'Running'
    case 'pending':
      return 'Pending'
  }
}

export function TestSuitesSidebar({
  testSuites,
  selectedTestSuiteId,
  onTestSuiteSelect,
  isLoading,
  auditId,
  onTriggerRun,
  isTriggering,
  scheduleText,
  cronSchedule,
  isParsing,
  parseError,
  onScheduleTextChange,
  onScheduleBlur,
}: TestSuitesSidebarProps) {
  return (
    <div className="w-80 flex-shrink-0 overflow-auto border-l bg-muted/20 p-4">
      {/* Trigger Button */}
      {auditId && (
        <button
          onClick={onTriggerRun}
          disabled={isTriggering}
          className="mb-4 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isTriggering ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>Running...</span>
            </>
          ) : (
            <>
              <Play className="size-4" />
              <span>Run Security Audit</span>
            </>
          )}
        </button>
      )}

      {/* Cron Schedule Component */}
      {auditId && (
        <div className="mb-4 rounded-lg border bg-muted/30 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="size-4" />
            Run Schedule
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={scheduleText}
              onChange={onScheduleTextChange}
              onBlur={onScheduleBlur}
              placeholder="e.g., every day at 5pm, every hour, every monday at 9am..."
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
            {isParsing && (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            )}
          </div>
          {cronSchedule && (
            <div className="mt-2 text-xs text-muted-foreground">
              Cron:{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
                {cronSchedule}
              </code>
            </div>
          )}
          {parseError && (
            <div className="mt-2 text-xs text-destructive">{parseError}</div>
          )}
        </div>
      )}

      <h3 className="mb-4 text-sm font-semibold">Test Suites</h3>
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : testSuites.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No test suites yet
        </div>
      ) : (
        <div className="space-y-3">
          {testSuites.map((suite) => (
            <Card
              key={suite.id}
              className={cn(
                'cursor-pointer py-3 transition-colors hover:bg-accent/50',
                selectedTestSuiteId === suite.id && 'ring-2 ring-primary',
              )}
              onClick={() => onTestSuiteSelect(suite.id)}
            >
              <CardHeader className="px-3 py-0">
                <CardTitle className="flex items-center gap-2 text-sm">
                  {getStatusIcon(suite.status)}
                  <span>{getStatusLabel(suite.status)}</span>
                  <RelativeTime
                    date={suite.createdAt}
                    shorthand={false}
                    className="text-xs text-muted-foreground font-normal"
                  />
                </CardTitle>
                {suite.score && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Score: {suite.score}
                  </div>
                )}
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
