export type VibeCheckScope =
  | { type: 'commits'; commits: string[] }
  | { type: 'commit'; commit: string }
  | { type: 'staged' }
  | { type: 'unstaged' }
  | { type: 'paths'; paths: string[] }

export type VibeCheckTarget = 'staged' | 'unstaged'

export type VibeCheckSeverity = 'info' | 'warn' | 'error'

export interface VibeCheckFinding {
  message: string
  path?: string
  suggestion?: string
  severity: VibeCheckSeverity
}

export interface VibeCheckResult {
  status: 'pass' | 'warn' | 'fail'
  summary: string
  findings?: VibeCheckFinding[]
}

export interface VibeCheckReporter {
  progress: (message: string) => void
}

export interface VibeCheckContext {
  gitRoot: string
  scope: VibeCheckScope
}

export interface VibeCheckAgent {
  id: string
  label: string
  description?: string
  run: (
    context: VibeCheckContext,
    reporter: VibeCheckReporter,
  ) => Promise<VibeCheckResult>
}

export type AgentRunStatus = 'pending' | 'running' | 'success' | 'warn' | 'fail'

export interface AgentRunState {
  id: string
  label: string
  status: AgentRunStatus
  progress?: string
  result?: VibeCheckResult
  error?: string
}
