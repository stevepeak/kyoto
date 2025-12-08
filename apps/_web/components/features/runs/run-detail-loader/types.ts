import { type AppRouter } from '@app/api'
import { type EvaluationOutput } from '@app/schemas'
import { type inferRouterOutputs } from '@trpc/server'

export type RunQueryOutput = inferRouterOutputs<AppRouter>['run']['getByRunId']
export type ApiRun = NonNullable<RunQueryOutput['run']>
export type ApiStory = NonNullable<RunQueryOutput['stories']>[number] & {
  branchName?: string | null
  commitSha?: string | null
}
export type ApiStoryResult = NonNullable<RunQueryOutput['storyResults']>[number]

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
    composition: unknown
  } | null
  testResult: StoryTestResult | null
  extTriggerDev: { runId: string } | null
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
  extTriggerDev: { runId: string | null } | null
}
