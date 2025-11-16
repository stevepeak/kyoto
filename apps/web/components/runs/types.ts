import type { LucideIcon } from 'lucide-react'
import type { EvaluationOutput } from '@app/schemas'

export interface StoryTestResult {
  id: string
  storyId: string
  status: 'pass' | 'fail' | 'running' | 'error'
  analysisVersion: number
  analysis: EvaluationOutput | null
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

export interface GitAuthor {
  id: number
  login: string
  name: string
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
  gitAuthor: GitAuthor | null
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

// Helper type for accessing conclusion from evaluation analysis
export type EvaluationConclusion = 'pass' | 'fail' | 'error'
