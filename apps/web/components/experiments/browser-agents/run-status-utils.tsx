import { type BrowserAgentRun, type RunDisplayStatus } from '@app/schemas'
import { CheckCircle, Circle, Loader2, XCircle } from 'lucide-react'

export function getDisplayStatus(run: BrowserAgentRun): RunDisplayStatus {
  if (run.status === 'running') {
    return { status: 'running', label: 'Running' }
  }
  if (run.status === 'pending') {
    return { status: 'pending', label: 'Pending' }
  }
  if (run.status === 'failed' || run.error) {
    return { status: 'failed', label: 'Failed' }
  }
  if (run.status === 'completed') {
    // Check if the agent task actually succeeded
    if (run.observations?.success === false) {
      return { status: 'failed', label: 'Failed' }
    }
    return { status: 'passed', label: 'Pass' }
  }
  return { status: run.status, label: run.status }
}

export function RunStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'passed':
      return <CheckCircle className="size-4 text-green-500" />
    case 'failed':
      return <XCircle className="size-4 text-destructive" />
    case 'running':
      return <Loader2 className="size-4 animate-spin text-blue-500" />
    default:
      return <Circle className="size-4 text-muted-foreground" />
  }
}
