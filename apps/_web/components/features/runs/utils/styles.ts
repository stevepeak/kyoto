import { type EvaluationConclusion, type StoryStatusPillStatus } from '../types'

export function getConclusionStyles(conclusion: EvaluationConclusion): {
  container: string
  badge: string
  label: string
} {
  switch (conclusion) {
    case 'pass':
      return {
        container: 'border-chart-1/40 bg-chart-1/10',
        badge: 'bg-chart-1 text-background',
        label: 'Passed',
      }
    case 'fail':
      return {
        container: 'border-destructive/40 bg-destructive/10',
        badge: 'bg-destructive text-destructive-foreground',
        label: 'Failed',
      }
    case 'error':
      return {
        container: 'border-orange-500/40 bg-orange-500/10',
        badge: 'bg-orange-500 text-white',
        label: 'Error',
      }
  }
}

export function getStatusPillStyles(status: StoryStatusPillStatus): {
  className: string
  label: string
} {
  switch (status) {
    case 'pass':
      return {
        className: 'border-chart-1/30 bg-chart-1/10 text-chart-1',
        label: 'Passed',
      }
    case 'fail':
      return {
        className: 'border-destructive/30 bg-destructive/10 text-destructive',
        label: 'Failed',
      }
    case 'running':
      return {
        className: 'border-primary/30 bg-primary/10 text-primary',
        label: 'In Progress',
      }
    case 'skipped':
      return {
        className: 'border-border bg-muted text-muted-foreground',
        label: 'Skipped',
      }
    case 'error':
      return {
        className: 'border-orange-500/30 bg-orange-500/10 text-orange-600',
        label: 'Error',
      }
    default:
      return {
        className: 'border-border bg-muted text-muted-foreground',
        label: status,
      }
  }
}
