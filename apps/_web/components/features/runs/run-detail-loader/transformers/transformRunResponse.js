'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.transformRunResponse = transformRunResponse
const normalizeStatus_1 = require('../utils/normalizeStatus')
function transformRunResponse(data) {
  let _a, _b, _c, _d, _e, _f, _g, _h, _j, _k
  if (!data.run) {
    return null
  }
  const storyMap = new Map(
    ((_a = data.stories) !== null && _a !== void 0 ? _a : []).map(
      function (story) {
        return [story.id, story]
      },
    ),
  )
  const storyResultMapById = new Map(
    ((_b = data.storyResults) !== null && _b !== void 0 ? _b : []).map(
      function (result) {
        return [result.id, result]
      },
    ),
  )
  const storyResultMapByStoryId = new Map(
    ((_c = data.storyResults) !== null && _c !== void 0 ? _c : []).map(
      function (result) {
        return [result.storyId, result]
      },
    ),
  )
  const run = data.run
  const createdAt =
    (_d = (0, normalizeStatus_1.toIsoString)(run.createdAt)) !== null &&
    _d !== void 0
      ? _d
      : new Date().toISOString()
  const updatedAt =
    (_e = (0, normalizeStatus_1.toIsoString)(run.updatedAt)) !== null &&
    _e !== void 0
      ? _e
      : createdAt
  const stories = ((_f = run.stories) !== null && _f !== void 0 ? _f : []).map(
    function (runStory) {
      let _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p
      const story = storyMap.get(runStory.storyId)
      let rawResult = null
      // First try to find by resultId if it exists
      if (runStory.resultId !== undefined && runStory.resultId !== null) {
        rawResult =
          (_a = storyResultMapById.get(runStory.resultId)) !== null &&
          _a !== void 0
            ? _a
            : null
      }
      // If not found by resultId, try to find by storyId
      if (!rawResult) {
        rawResult =
          (_b = storyResultMapByStoryId.get(runStory.storyId)) !== null &&
          _b !== void 0
            ? _b
            : null
      }
      const testResult = rawResult
        ? {
            id: rawResult.id,
            storyId: rawResult.storyId,
            status: (0, normalizeStatus_1.normalizeStoryResultStatus)(
              rawResult.status,
            ),
            analysisVersion: rawResult.analysisVersion,
            analysis: rawResult.analysis, // Keep as any - cross-domain type issue
            startedAt: (0, normalizeStatus_1.toIsoString)(rawResult.startedAt),
            completedAt: (0, normalizeStatus_1.toIsoString)(
              rawResult.completedAt,
            ),
            durationMs:
              (_c = rawResult.durationMs) !== null && _c !== void 0 ? _c : null,
            createdAt: (0, normalizeStatus_1.toIsoString)(rawResult.createdAt),
            updatedAt: (0, normalizeStatus_1.toIsoString)(rawResult.updatedAt),
          }
        : null
      return {
        storyId: runStory.storyId,
        status: (0, normalizeStatus_1.normalizeRunStoryStatus)(runStory.status),
        resultId:
          (_d = runStory.resultId) !== null && _d !== void 0 ? _d : null,
        summary: (_e = runStory.summary) !== null && _e !== void 0 ? _e : null,
        startedAt:
          (_g =
            (_f = runStory.startedAt) !== null && _f !== void 0
              ? _f
              : testResult
                ? (0, normalizeStatus_1.toIsoString)(testResult.startedAt)
                : null) !== null && _g !== void 0
            ? _g
            : null,
        completedAt:
          (_j =
            (_h = runStory.completedAt) !== null && _h !== void 0
              ? _h
              : testResult
                ? (0, normalizeStatus_1.toIsoString)(testResult.completedAt)
                : null) !== null && _j !== void 0
            ? _j
            : null,
        story: story
          ? {
              id: story.id,
              name: story.name,
              story: story.story,
              branchName:
                (_k = story.branchName) !== null && _k !== void 0
                  ? _k
                  : run.branchName,
              commitSha:
                (_l = story.commitSha) !== null && _l !== void 0 ? _l : null,
              createdAt:
                (_m = (0, normalizeStatus_1.toIsoString)(story.createdAt)) !==
                  null && _m !== void 0
                  ? _m
                  : new Date().toISOString(),
              updatedAt:
                (_o = (0, normalizeStatus_1.toIsoString)(story.updatedAt)) !==
                  null && _o !== void 0
                  ? _o
                  : new Date().toISOString(),
              composition:
                (_p = story.composition) !== null && _p !== void 0 ? _p : null,
            }
          : null,
        testResult,
        extTriggerDev: (function () {
          if (
            !(rawResult === null || rawResult === void 0
              ? void 0
              : rawResult.extTriggerDev)
          ) {
            return null
          }
          try {
            const parsed =
              typeof rawResult.extTriggerDev === 'string'
                ? JSON.parse(rawResult.extTriggerDev)
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
          } catch (_a) {
            // Invalid JSON, leave as null
          }
          return null
        })(),
      }
    },
  )
  // Parse gitAuthor from JSONB
  let gitAuthor = null
  if (run.gitAuthor) {
    try {
      var parsed =
        typeof run.gitAuthor === 'string'
          ? JSON.parse(run.gitAuthor)
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
    } catch (_l) {
      // Invalid JSON, leave as null
    }
  }
  // Parse extTriggerDev from JSONB
  let extTriggerDev = null
  if (run.extTriggerDev) {
    try {
      var parsed =
        typeof run.extTriggerDev === 'string'
          ? JSON.parse(run.extTriggerDev)
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
    } catch (_m) {
      // Invalid JSON, leave as null
    }
  }
  return {
    id: run.id,
    commitSha: (_g = run.commitSha) !== null && _g !== void 0 ? _g : null,
    branchName: run.branchName,
    commitMessage:
      (_h = run.commitMessage) !== null && _h !== void 0 ? _h : null,
    prNumber: (_j = run.prNumber) !== null && _j !== void 0 ? _j : null,
    status: (0, normalizeStatus_1.normalizeRunStatus)(run.status),
    summary: (_k = run.summary) !== null && _k !== void 0 ? _k : null,
    createdAt,
    updatedAt,
    stories,
    gitAuthor,
    extTriggerDev,
  }
}
