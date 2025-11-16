import { Suspense } from 'react'
import type { inferRouterOutputs } from '@trpc/server'

import { getTRPCCaller } from '@/lib/trpc-server'
import { AppLayout } from '@/components/layout'
import { LoadingProgress } from '@/components/ui/loading-progress'
import { RunDetailView } from '@/components/runs/RunDetailView'
import type { AppRouter } from '@app/api'
import type { EvaluationOutput } from '@app/schemas'

type RunQueryOutput = inferRouterOutputs<AppRouter>['run']['getByRunId']
type ApiRun = NonNullable<RunQueryOutput['run']>
type ApiStory = NonNullable<RunQueryOutput['stories']>[number] & {
  branchName?: string | null
  commitSha?: string | null
}
type ApiStoryResult = NonNullable<RunQueryOutput['storyResults']>[number]

interface StoryTestResult {
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

interface RunStory {
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

interface GitAuthor {
  id: number
  login: string
  name: string
}

interface Run {
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

const STORY_RESULT_STATUS_VALUES: readonly StoryTestResult['status'][] = [
  'pass',
  'fail',
  'running',
  'error',
] as const

const RUN_STORY_STATUS_VALUES: readonly RunStory['status'][] = [
  'pass',
  'fail',
  'running',
  'skipped',
  'error',
] as const

const RUN_STATUS_VALUES: readonly Run['status'][] = [
  'pass',
  'fail',
  'skipped',
  'running',
  'error',
] as const

function normalizeStoryResultStatus(
  status: unknown,
): StoryTestResult['status'] {
  return STORY_RESULT_STATUS_VALUES.includes(
    status as StoryTestResult['status'],
  )
    ? (status as StoryTestResult['status'])
    : 'error'
}

function normalizeRunStoryStatus(status: unknown): RunStory['status'] {
  return RUN_STORY_STATUS_VALUES.includes(status as RunStory['status'])
    ? (status as RunStory['status'])
    : 'error'
}

function normalizeRunStatus(status: unknown): Run['status'] {
  return RUN_STATUS_VALUES.includes(status as Run['status'])
    ? (status as Run['status'])
    : 'error'
}

function toIsoString(value: unknown): string | null {
  if (!value) {
    return null
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  if (typeof value === 'string') {
    return value
  }
  return null
}

function transformRunResponse(data: RunQueryOutput): Run | null {
  if (!data.run) {
    return null
  }

  const storyMap = new Map<string, ApiStory>(
    (data.stories ?? []).map((story) => [story.id, story]),
  )
  const storyResultMapById = new Map<string, ApiStoryResult>(
    (data.storyResults ?? []).map((result) => [result.id, result]),
  )
  const storyResultMapByStoryId = new Map<string, ApiStoryResult>(
    (data.storyResults ?? []).map((result) => [result.storyId, result]),
  )

  const run: ApiRun = data.run
  const createdAt = toIsoString(run.createdAt) ?? new Date().toISOString()
  const updatedAt = toIsoString(run.updatedAt) ?? createdAt

  const stories: RunStory[] = (run.stories ?? []).map((runStory) => {
    const story = storyMap.get(runStory.storyId)
    let rawResult: ApiStoryResult | null = null

    // First try to find by resultId if it exists
    if (runStory.resultId !== undefined && runStory.resultId !== null) {
      rawResult = storyResultMapById.get(runStory.resultId) ?? null
    }

    // If not found by resultId, try to find by storyId
    if (!rawResult) {
      rawResult = storyResultMapByStoryId.get(runStory.storyId) ?? null
    }

    const testResult: StoryTestResult | null = rawResult
      ? {
          id: rawResult.id,
          storyId: rawResult.storyId,
          status: normalizeStoryResultStatus(rawResult.status),
          analysisVersion: rawResult.analysisVersion,
          analysis: rawResult.analysis as any, // Keep as any - cross-domain type issue
          startedAt: toIsoString(rawResult.startedAt),
          completedAt: toIsoString(rawResult.completedAt),
          durationMs: rawResult.durationMs ?? null,
          createdAt: toIsoString(rawResult.createdAt),
          updatedAt: toIsoString(rawResult.updatedAt),
        }
      : null

    return {
      storyId: runStory.storyId,
      status: normalizeRunStoryStatus(runStory.status),
      resultId: runStory.resultId ?? null,
      summary: runStory.summary ?? null,
      startedAt:
        runStory.startedAt ??
        (testResult ? toIsoString(testResult.startedAt) : null) ??
        null,
      completedAt:
        runStory.completedAt ??
        (testResult ? toIsoString(testResult.completedAt) : null) ??
        null,
      story: story
        ? {
            id: story.id,
            name: story.name,
            story: story.story,
            branchName: story.branchName ?? run.branchName,
            commitSha: story.commitSha ?? null,
            createdAt: toIsoString(story.createdAt) ?? new Date().toISOString(),
            updatedAt: toIsoString(story.updatedAt) ?? new Date().toISOString(),
            decomposition: story.decomposition ?? null,
          }
        : null,
      testResult,
    }
  })

  // Parse gitAuthor from JSONB
  let gitAuthor: GitAuthor | null = null
  if (run.gitAuthor) {
    try {
      const parsed =
        typeof run.gitAuthor === 'string'
          ? (JSON.parse(run.gitAuthor) as unknown)
          : run.gitAuthor
      if (
        parsed &&
        typeof parsed === 'object' &&
        'id' in parsed &&
        'login' in parsed &&
        'name' in parsed
      ) {
        gitAuthor = {
          id: Number(parsed.id),
          login: String(parsed.login),
          name: String(parsed.name),
        }
      }
    } catch {
      // Invalid JSON, leave as null
    }
  }

  return {
    id: run.id,
    commitSha: run.commitSha ?? null,
    branchName: run.branchName,
    commitMessage: run.commitMessage ?? null,
    prNumber: run.prNumber ?? null,
    status: normalizeRunStatus(run.status),
    summary: run.summary ?? null,
    createdAt,
    updatedAt,
    stories,
    gitAuthor,
  }
}

async function RunDetailContent({
  orgName,
  repoName,
  runId,
}: {
  orgName: string
  repoName: string
  runId: string
}) {
  const trpc = await getTRPCCaller()

  const resp = await trpc.run.getByRunId({
    orgName,
    repoName,
    runId,
  })

  if (!resp.run) {
    return (
      <AppLayout
        breadcrumbs={[
          { label: orgName, href: `/org/${orgName}` },
          { label: repoName, href: `/org/${orgName}/repo/${repoName}` },
        ]}
      >
        <div className="p-6 text-sm text-red-500">Run not found</div>
      </AppLayout>
    )
  }

  const transformedRun = transformRunResponse(resp)
  if (!transformedRun) {
    return (
      <AppLayout
        breadcrumbs={[
          { label: orgName, href: `/org/${orgName}` },
          { label: repoName, href: `/org/${orgName}/repo/${repoName}` },
        ]}
      >
        <div className="p-6 text-sm text-red-500">Run not found</div>
      </AppLayout>
    )
  }

  return (
    <AppLayout
      breadcrumbs={[
        { label: orgName, href: `/org/${orgName}` },
        { label: repoName, href: `/org/${orgName}/repo/${repoName}` },
      ]}
    >
      <RunDetailView run={transformedRun} orgName={orgName} repoName={repoName} />
    </AppLayout>
  )
}

export function RunDetailLoader({
  orgName,
  repoName,
  runId,
}: {
  orgName: string
  repoName: string
  runId: string
}) {
  return (
    <Suspense fallback={
      <AppLayout
        breadcrumbs={[
          { label: orgName, href: `/org/${orgName}` },
          { label: repoName, href: `/org/${orgName}/repo/${repoName}` },
        ]}
      >
        <LoadingProgress label="Loading run..." />
      </AppLayout>
    }>
      <RunDetailContent orgName={orgName} repoName={repoName} runId={runId} />
    </Suspense>
  )
}
