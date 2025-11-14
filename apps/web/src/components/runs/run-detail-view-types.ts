import type { LucideIcon } from 'lucide-react'

export interface StoryAnalysisEvidence {
  step: string | null
  conclusion: 'pass' | 'fail'
  filePath: string
  startLine: number | null
  endLine: number | null
  note: string | null
}

export interface StoryAnalysis {
  conclusion: 'pass' | 'fail' | 'error'
  explanation: string
  evidence: StoryAnalysisEvidence[]
}

export interface StoryTestResult {
  id: string
  storyId: string
  status: 'pass' | 'fail' | 'running' | 'error'
  analysisVersion: number
  analysis: any // ! Cross domain issue here where the type is in @app/agents
  startedAt: string | null
  completedAt: string | null
  durationMs: number | null
  createdAt: string | null
  updatedAt: string | null
}

export interface RunStory {
  storyId: string
  resultId: string | null
  status: 'pass' | 'fail' | 'running' | 'skipped' | 'error'
  summary: string | null
  startedAt: string | null
  completedAt: string | null
  story: {
    id: string
    name: string
    story: string
    branchName: string
    commitSha: string | null
    createdAt: string
    updatedAt: string
    decomposition: unknown
  } | null
  testResult: StoryTestResult | null
}

export interface Run {
  id: string
  commitSha: string | null
  branchName: string
  commitMessage: string | null
  prNumber: string | null
  status: 'pass' | 'fail' | 'skipped' | 'running' | 'error'
  summary: string | null
  createdAt: string
  updatedAt: string
  stories: RunStory[]
}

export interface RunDetailViewProps {
  run: Run
  orgName: string
  repoName: string
}

export interface StatusDisplay {
  label: string
  Icon: LucideIcon
  heroClassName: string
  chipClassName: string
  chipIconClassName: string
  shouldSpin: boolean
}

export type StoryStatusPillStatus =
  | RunStory['status']
  | StoryTestResult['status']

export interface EvidenceConclusionDisplay {
  Icon: LucideIcon
  iconClassName: string
  label: string
}
