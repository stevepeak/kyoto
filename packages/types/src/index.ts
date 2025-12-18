import { type LanguageModel } from 'ai'

export type VibeCheckScope =
  | { type: 'commits'; commits: string[] }
  | { type: 'commit'; commit: string }
  | { type: 'staged' }
  | { type: 'unstaged' }
  | { type: 'changes' }
  | { type: 'paths'; paths: string[] }

export type VibeCheckTarget = 'staged' | 'unstaged'

export type VibeCheckSeverity = 'info' | 'warn' | 'bug' | 'error' | 'high'

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

export interface ScopeContext {
  filePaths: string[]
  diffs: Record<string, string> // path -> diff content
  fileContents: Record<string, string> // path -> full file content (for untracked files or when diff not available)
}

export interface VibeCheckContext {
  gitRoot: string
  scope: VibeCheckScope
  scopeContent: ScopeContext // Pre-retrieved content to save tokens
  model: LanguageModel
  github?: {
    owner: string
    repo: string
    sha: string
    token: string
  }
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
