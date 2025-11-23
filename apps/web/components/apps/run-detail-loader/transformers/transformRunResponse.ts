import type {
  RunQueryOutput,
  ApiRun,
  ApiStory,
  ApiStoryResult,
  StoryTestResult,
  RunStory,
  GitAuthor,
  Run,
} from '../types'
import {
  normalizeStoryResultStatus,
  normalizeRunStoryStatus,
  normalizeRunStatus,
  toIsoString,
} from '../utils/normalizeStatus'

export function transformRunResponse(data: RunQueryOutput): Run | null {
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
      extTriggerDev: (() => {
        if (!rawResult?.extTriggerDev) {
          return null
        }
        try {
          const parsed =
            typeof rawResult.extTriggerDev === 'string'
              ? (JSON.parse(rawResult.extTriggerDev) as unknown)
              : rawResult.extTriggerDev
          if (
            parsed &&
            typeof parsed === 'object' &&
            'runId' in parsed &&
            parsed.runId !== null &&
            parsed.runId !== undefined
          ) {
            const runId = parsed.runId
            if (
              typeof runId === 'string' ||
              typeof runId === 'number' ||
              typeof runId === 'boolean'
            ) {
              return { runId: String(runId) }
            }
          }
        } catch {
          // Invalid JSON, leave as null
        }
        return null
      })(),
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

  // Parse extTriggerDev from JSONB
  let extTriggerDev: { runId: string | null } | null = null
  if (run.extTriggerDev) {
    try {
      const parsed =
        typeof run.extTriggerDev === 'string'
          ? (JSON.parse(run.extTriggerDev) as unknown)
          : run.extTriggerDev
      if (parsed && typeof parsed === 'object' && 'runId' in parsed) {
        const runId = parsed.runId
        if (runId !== null && runId !== undefined) {
          if (
            typeof runId === 'string' ||
            typeof runId === 'number' ||
            typeof runId === 'boolean'
          ) {
            extTriggerDev = {
              runId: String(runId),
            }
          }
        } else {
          extTriggerDev = { runId: null }
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
    extTriggerDev,
  }
}
