import { useEffect, useState } from 'react'
import type { inferRouterOutputs } from '@trpc/server'

import { useTRPCClient } from '@/client/trpc'
import { AppLayout } from '@/components/layout'
import { LoadingProgress } from '@/components/ui/loading-progress'
import { RunDetailView } from '@/components/runs/RunDetailView'
import type { AppRouter } from '@app/api'

type RunQueryOutput = inferRouterOutputs<AppRouter>['run']['getByRunId']
type ApiRun = NonNullable<RunQueryOutput['run']>
type ApiStory = NonNullable<RunQueryOutput['stories']>[number] & {
  branchName?: string | null
  commitSha?: string | null
}
type ApiStoryResult = NonNullable<RunQueryOutput['storyResults']>[number]

interface StoryAnalysisEvidence {
  step: string | null
  conclusion: 'pass' | 'fail'
  filePath: string
  startLine: number | null
  endLine: number | null
  note: string | null
}

interface StoryAnalysis {
  conclusion: 'pass' | 'fail' | 'error'
  explanation: string
  evidence: StoryAnalysisEvidence[]
}

interface StoryResult {
  id: string
  storyId: string
  status: 'pass' | 'fail' | 'running' | 'error'
  analysisVersion: number
  analysis: StoryAnalysis | null
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
  result: StoryResult | null
  story: {
    id: string
    name: string
    story: string
    branchName: string
    commitSha: string | null
    createdAt: string
    updatedAt: string
  } | null
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
}

const STORY_RESULT_STATUS_VALUES: readonly StoryResult['status'][] = [
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

function normalizeStoryResultStatus(status: unknown): StoryResult['status'] {
  return STORY_RESULT_STATUS_VALUES.includes(status as StoryResult['status'])
    ? (status as StoryResult['status'])
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

function toNullableString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toNullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function pickString(
  source: Record<string, unknown>,
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    if (key in source) {
      const value = toNullableString(source[key])
      if (value !== null) {
        return value
      }
    }
  }
  return null
}

function pickNumber(
  source: Record<string, unknown>,
  keys: readonly string[],
): number | null {
  for (const key of keys) {
    if (key in source) {
      const value = toNullableNumber(source[key])
      if (value !== null) {
        return value
      }
    }
  }
  return null
}

function normalizeEvidence(value: unknown): StoryAnalysisEvidence | null {
  if (!value) {
    return null
  }

  let candidateValue = value
  if (typeof candidateValue === 'string') {
    try {
      candidateValue = JSON.parse(candidateValue) as Record<string, unknown>
    } catch {
      return null
    }
  }

  if (typeof candidateValue !== 'object' || candidateValue === null) {
    return null
  }

  const candidate = candidateValue as Record<string, unknown>

  const filePath =
    pickString(candidate, ['filePath', 'filepath', 'path', 'file']) ?? null
  if (!filePath) {
    return null
  }

  let startLine = pickNumber(candidate, [
    'startLine',
    'start_line',
    'lineStart',
    'start',
  ])
  let endLine = pickNumber(candidate, [
    'endLine',
    'end_line',
    'lineEnd',
    'end',
  ])

  const lines = candidate['lines']
  if (Array.isArray(lines)) {
    if (startLine === null) {
      startLine = toNullableNumber(lines[0])
    }
    if (endLine === null) {
      endLine = toNullableNumber(lines[1])
    }
  } else if (typeof lines === 'string') {
    const parts = lines.split('-')
    if (parts.length >= 1 && startLine === null) {
      startLine = toNullableNumber(parts[0])
    }
    if (parts.length >= 2 && endLine === null) {
      endLine = toNullableNumber(parts[1])
    }
  } else if (typeof lines === 'object' && lines !== null) {
    const linesRecord = lines as Record<string, unknown>
    if (startLine === null) {
      startLine = toNullableNumber(linesRecord['start'])
    }
    if (endLine === null) {
      endLine = toNullableNumber(linesRecord['end'])
    }
  }

  const step =
    pickString(candidate, ['step', 'title', 'goal']) ?? null
  const note =
    pickString(candidate, ['note', 'summary', 'description', 'explanation']) ??
    null

  const rawConclusion =
    pickString(candidate, ['conclusion', 'status', 'result']) ?? undefined
  const conclusion: StoryAnalysisEvidence['conclusion'] =
    rawConclusion === 'pass' ? 'pass' : 'fail'

  return {
    step,
    conclusion,
    filePath,
    startLine,
    endLine: endLine ?? startLine,
    note,
  }
}

function normalizeStoryAnalysis(value: unknown): StoryAnalysis | null {
  if (!value) {
    return null
  }

  let candidateValue = value
  if (typeof candidateValue === 'string') {
    try {
      candidateValue = JSON.parse(candidateValue) as Record<string, unknown>
    } catch {
      return null
    }
  }

  if (typeof candidateValue !== 'object' || candidateValue === null) {
    return null
  }

  const candidate = candidateValue as Record<string, unknown>

  const evidenceValue = candidate['evidence']
  let evidenceSource: unknown[] = []
  if (Array.isArray(evidenceValue)) {
    evidenceSource = evidenceValue
  } else if (typeof evidenceValue === 'string') {
    try {
      const parsed: unknown = JSON.parse(evidenceValue)
      if (Array.isArray(parsed)) {
        evidenceSource = parsed
      }
    } catch {
      // ignore parse failures
    }
  }

  if (evidenceSource.length === 0) {
    const legacyEvidence = candidate['codeReferences']
    if (Array.isArray(legacyEvidence)) {
      evidenceSource = legacyEvidence
    } else if (typeof legacyEvidence === 'string') {
      try {
        const parsed: unknown = JSON.parse(legacyEvidence)
        if (Array.isArray(parsed)) {
          evidenceSource = parsed
        }
      } catch {
        // ignore parse failures
      }
    }
  }

  const evidence = evidenceSource
    .map(normalizeEvidence)
    .filter((item): item is StoryAnalysisEvidence => item !== null)

  const explanation =
    pickString(candidate, ['explanation', 'summary', 'description', 'details']) ??
    (evidence.length > 0 ? 'Evidence available.' : null)

  if (!explanation) {
    return null
  }

  const rawConclusion =
    pickString(candidate, ['conclusion', 'status', 'outcome']) ?? null

  let conclusion: StoryAnalysis['conclusion'] = 'error'
  if (
    rawConclusion === 'pass' ||
    rawConclusion === 'fail' ||
    rawConclusion === 'error'
  ) {
    conclusion = rawConclusion
  } else if (rawConclusion === 'success' || rawConclusion === 'passed') {
    conclusion = 'pass'
  } else if (rawConclusion === 'failed' || rawConclusion === 'failure') {
    conclusion = 'fail'
  }

  return {
    conclusion,
    explanation,
    evidence,
  }
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
  const storyResultMap = new Map<string, ApiStoryResult>(
    (data.storyResults ?? []).map((result) => [result.id, result]),
  )

  const run: ApiRun = data.run
  const createdAt = toIsoString(run.createdAt) ?? new Date().toISOString()
  const updatedAt = toIsoString(run.updatedAt) ?? createdAt

  const stories: RunStory[] = (run.stories ?? []).map((runStory) => {
    const story = storyMap.get(runStory.storyId)
    const rawResult =
      runStory.resultId !== undefined && runStory.resultId !== null
        ? (storyResultMap.get(runStory.resultId) ?? null)
        : null

      const analysis = rawResult
        ? normalizeStoryAnalysis(rawResult.analysis)
        : null

    const result: StoryResult | null = rawResult
      ? {
          id: rawResult.id,
          storyId: rawResult.storyId,
          status: normalizeStoryResultStatus(rawResult.status),
          analysisVersion: rawResult.analysisVersion,
          analysis,
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
        (result ? toIsoString(result.startedAt) : null) ??
        null,
      completedAt:
        runStory.completedAt ??
        (result ? toIsoString(result.completedAt) : null) ??
        null,
      result,
      story: story
        ? {
            id: story.id,
            name: story.name,
            story: story.story,
            branchName: story.branchName ?? run.branchName,
            commitSha: story.commitSha ?? null,
            createdAt: toIsoString(story.createdAt) ?? new Date().toISOString(),
            updatedAt: toIsoString(story.updatedAt) ?? new Date().toISOString(),
          }
        : null,
    }
  })

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
  }
}

export function RunDetailLoader({
  orgSlug,
  repoName,
  runId,
}: {
  orgSlug: string
  repoName: string
  runId: string
}) {
  const trpc = useTRPCClient()
  const [isLoading, setIsLoading] = useState(true)
  const [run, setRun] = useState<Run | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    async function load() {
      try {
        const resp = await trpc.run.getByRunId.query({
          orgSlug,
          repoName,
          runId,
        })
        if (!isMounted) {
          return
        }
        if (!resp.run) {
          setError('Run not found')
          return
        }
        const transformedRun = transformRunResponse(resp)
        if (!transformedRun) {
          setError('Run not found')
          return
        }
        setError(null)
        setRun(transformedRun)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load run')
      } finally {
        setIsLoading(false)
      }
    }
    void load()
    return () => {
      isMounted = false
    }
  }, [trpc, orgSlug, repoName, runId])

  return (
    <AppLayout
      breadcrumbs={[
        { label: orgSlug, href: `/org/${orgSlug}` },
        { label: repoName, href: `/org/${orgSlug}/repo/${repoName}` },
      ]}
    >
      {isLoading ? (
        <LoadingProgress label="Loading run..." />
      ) : error ? (
        <div className="p-6 text-sm text-red-500">{error}</div>
      ) : run ? (
        <RunDetailView run={run} orgSlug={orgSlug} repoName={repoName} />
      ) : null}
    </AppLayout>
  )
}
