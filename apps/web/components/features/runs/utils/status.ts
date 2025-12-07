import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MinusCircle,
  XCircle,
} from 'lucide-react'

import {
  type Run,
  type RunStory,
  type StatusDisplay,
  type StoryStatusPillStatus,
} from '../types'

export function getStatusDisplay(status: Run['status']): StatusDisplay {
  switch (status) {
    case 'pass':
      return {
        label: 'Succeeded',
        Icon: CheckCircle2,
        heroClassName: 'text-chart-1',
        chipClassName: 'border-chart-1/30 bg-chart-1/10 text-chart-1',
        chipIconClassName: 'text-chart-1',
        shouldSpin: false,
      }
    case 'fail':
      return {
        label: 'Failed',
        Icon: XCircle,
        heroClassName: 'text-destructive',
        chipClassName:
          'border-destructive/30 bg-destructive/10 text-destructive',
        chipIconClassName: 'text-destructive',
        shouldSpin: false,
      }
    case 'skipped':
      return {
        label: 'Skipped',
        Icon: MinusCircle,
        heroClassName: 'text-muted-foreground',
        chipClassName: 'border-border bg-muted text-muted-foreground',
        chipIconClassName: 'text-muted-foreground',
        shouldSpin: false,
      }
    case 'running':
      return {
        label: 'In progress',
        Icon: Loader2,
        heroClassName: 'text-primary',
        chipClassName: 'border-primary/30 bg-primary/10 text-primary',
        chipIconClassName: 'text-primary',
        shouldSpin: true,
      }
    case 'error':
      return {
        label: 'Error',
        Icon: AlertTriangle,
        heroClassName: 'text-orange-600',
        chipClassName: 'border-orange-500/30 bg-orange-500/10 text-orange-600',
        chipIconClassName: 'text-orange-600',
        shouldSpin: false,
      }
  }
}

export function getRunStatusDescriptor(status: Run['status']): string {
  switch (status) {
    case 'pass':
      return 'passed'
    case 'fail':
      return 'failed'
    case 'skipped':
      return 'skipped'
    case 'running':
      return 'running'
    case 'error':
      return 'errored'
  }
}

export function getDisplayStatus(story: RunStory): StoryStatusPillStatus {
  return story.testResult?.status ?? story.status
}

export function getStoryTimestamps(story: RunStory) {
  const testResult = story.testResult
  return {
    startedAt: testResult?.startedAt ?? story.startedAt,
    completedAt: testResult?.completedAt ?? story.completedAt,
    durationMs:
      testResult?.durationMs ??
      (testResult?.startedAt && testResult?.completedAt
        ? new Date(testResult.completedAt).getTime() -
          new Date(testResult.startedAt).getTime()
        : story.startedAt && story.completedAt
          ? new Date(story.completedAt).getTime() -
            new Date(story.startedAt).getTime()
          : null),
  }
}
