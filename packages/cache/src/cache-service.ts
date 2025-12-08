import { type DB } from '@app/db'
import {
  assertionCacheEntrySchema,
  type CacheData,
  type CacheEntry,
  type ValidationResult,
} from '@app/schemas'
import { type Sandbox } from '@daytonaio/sdk'
import { type Kysely, sql } from 'kysely'

import { buildEvidenceHashMap, getFileHashFromSandbox } from './cache-evidence'

/**
 * Retrieves cached evidence for a story at a specific commit SHA or from a list of commit SHAs.
 * When multiple commit SHAs are provided, returns the cache entry for the latest commit SHA
 * (first in the array, as git log returns commits in chronological order latest-first).
 */
export async function getCachedEvidence(args: {
  db: Kysely<DB>
  storyId: string
  commitSha: string | string[]
}): Promise<CacheEntry | null> {
  const { db, storyId, commitSha } = args

  // Handle single commit SHA (backward compatibility)
  if (typeof commitSha === 'string') {
    const result = await db
      .selectFrom('storyEvidenceCache')
      .selectAll()
      .where('storyId', '=', storyId)
      .where('commitSha', '=', commitSha)
      .executeTakeFirst()

    if (!result) {
      return null
    }

    return {
      id: result.id,
      branchName: result.branchName,
      storyId: result.storyId,
      commitSha: result.commitSha,
      cacheData: result.cacheData as CacheData,
      runId: result.runId,
      createdAt: result.createdAt ?? new Date(),
      updatedAt: result.updatedAt ?? new Date(),
    }
  }

  // Handle array of commit SHAs - find the latest one with a cache entry
  if (commitSha.length === 0) {
    return null
  }

  // Build CASE statement for ORDER BY to preserve git log order (latest first)
  // This ensures we get the cache entry for the earliest commit SHA in the array
  // that has a cache entry (which is the latest chronologically)
  // Commit SHAs are hex strings, so they're safe from SQL injection, but we escape quotes anyway
  const orderByCases = commitSha
    .map((sha, index) => `WHEN '${sha.replace(/'/g, "''")}' THEN ${index}`)
    .join(' ')

  const result = await db
    .selectFrom('storyEvidenceCache')
    .selectAll()
    .where('storyId', '=', storyId)
    .where('commitSha', 'in', commitSha)
    .orderBy(sql`CASE commit_sha ${sql.raw(orderByCases)} END`)
    .limit(1)
    .executeTakeFirst()

  if (!result) {
    return null
  }

  return {
    id: result.id,
    branchName: result.branchName,
    storyId: result.storyId,
    commitSha: result.commitSha,
    cacheData: result.cacheData as CacheData,
    runId: result.runId,
    createdAt: result.createdAt ?? new Date(),
    updatedAt: result.updatedAt ?? new Date(),
  }
}

/**
 * Saves cached evidence for a story at a specific commit SHA
 */
export async function saveCachedEvidence(args: {
  db: Kysely<DB>
  branchName: string
  storyId: string
  commitSha: string
  cacheData: CacheData
  runId: string
}): Promise<void> {
  const { db, branchName, storyId, commitSha, cacheData, runId } = args

  await db
    .insertInto('storyEvidenceCache')
    .values({
      branchName,
      storyId,
      commitSha,
      cacheData: JSON.stringify(cacheData),
      runId,
    })
    .onConflict((oc) => oc.columns(['storyId', 'commitSha']).doNothing())
    .execute()
}

/**
 * Validates a cache entry against current file hashes
 * Returns which steps/assertions are still valid
 */
export async function validateCacheEntry(args: {
  cacheEntry: CacheEntry
  sandbox: Sandbox
  invalidationStrategy: 'step' | 'assertion'
}): Promise<ValidationResult> {
  const { cacheEntry, sandbox: _sandbox, invalidationStrategy } = args

  const invalidSteps: number[] = []
  const invalidAssertions: {
    stepIndex: number
    assertionIndex: number
  }[] = []

  // Iterate through cached steps
  for (const [stepIndexStr, stepData] of Object.entries(
    cacheEntry.cacheData.steps,
  )) {
    const stepIndex = Number.parseInt(stepIndexStr, 10)
    let stepHasInvalidAssertion = false

    // Type guard to ensure stepData has assertions
    if (
      !stepData ||
      typeof stepData !== 'object' ||
      !('assertions' in stepData)
    ) {
      continue
    }

    // Iterate through cached assertions for this step
    for (const [assertionIndexStr, assertionCacheData] of Object.entries(
      stepData.assertions,
    )) {
      const assertionIndex = Number.parseInt(assertionIndexStr, 10)

      // Parse cache entry using Zod
      const parseResult =
        assertionCacheEntrySchema.safeParse(assertionCacheData)

      if (!parseResult.success) {
        // Invalid cache entry - treat as invalid
        invalidAssertions.push({ stepIndex, assertionIndex })
        if (invalidationStrategy === 'step') {
          stepHasInvalidAssertion = true
        }
        continue
      }

      const cacheEntry = parseResult.data

      // If assertion only has a reason (no evidence), skip validation
      // since there's no file to validate
      if (
        !cacheEntry.evidence ||
        Object.keys(cacheEntry.evidence).length === 0
      ) {
        continue
      }

      // Check each file hash in the cached evidence
      let assertionIsValid = true
      for (const [filename, fileCacheEntry] of Object.entries(
        cacheEntry.evidence,
      ) as [string, { hash: string; lineRanges: string[] }][]) {
        try {
          const cachedHash = fileCacheEntry.hash
          const currentHash = await getFileHashFromSandbox(filename)
          if (currentHash !== cachedHash) {
            assertionIsValid = false
            stepHasInvalidAssertion = true
            break
          }
        } catch {
          // File not found or error reading file - treat as invalid
          assertionIsValid = false
          stepHasInvalidAssertion = true
          break
        }
      }

      if (!assertionIsValid) {
        invalidAssertions.push({ stepIndex, assertionIndex })
        if (invalidationStrategy === 'step') {
          stepHasInvalidAssertion = true
        }
      }
    }

    if (stepHasInvalidAssertion && invalidationStrategy === 'step') {
      invalidSteps.push(stepIndex)
    }
  }

  const isValid = invalidSteps.length === 0 && invalidAssertions.length === 0

  return {
    isValid,
    invalidSteps,
    invalidAssertions,
  }
}

/**
 * Invalidates cache for a story at a specific commit SHA
 */
export async function invalidateCache(args: {
  db: Kysely<DB>
  storyId: string
  commitSha: string
}): Promise<void> {
  const { db, storyId, commitSha } = args

  await db
    .deleteFrom('storyEvidenceCache')
    .where('storyId', '=', storyId)
    .where('commitSha', '=', commitSha)
    .execute()
}

/**
 * Invalidates all cache entries for a story (across all branches)
 * Used when composition changes
 */
export async function invalidateCacheForStory(args: {
  db: Kysely<DB>
  storyId: string
}): Promise<void> {
  const { db, storyId } = args

  await db
    .deleteFrom('storyEvidenceCache')
    .where('storyId', '=', storyId)
    .execute()
}

/**
 * Builds cache data from evaluation results
 * Includes both passing and failing steps (but not errors)
 */
export async function buildCacheDataFromEvaluation(args: {
  evaluation: {
    steps: {
      conclusion: string
      assertions: {
        evidence: string[]
        reason?: string
      }[]
    }[]
  }
  sandbox: Sandbox
}): Promise<CacheData> {
  const { evaluation, sandbox } = args

  const cacheData: CacheData = {
    steps: {},
  }

  for (let stepIndex = 0; stepIndex < evaluation.steps.length; stepIndex++) {
    const step = evaluation.steps[stepIndex]

    // Cache steps that passed or failed (but not errors)
    if (step.conclusion !== 'pass' && step.conclusion !== 'fail') {
      continue
    }

    const stepData: CacheData['steps'][string] = {
      conclusion: step.conclusion,
      assertions: {},
    }
    cacheData.steps[stepIndex.toString()] = stepData

    for (
      let assertionIndex = 0;
      assertionIndex < step.assertions.length;
      assertionIndex++
    ) {
      const assertion = step.assertions[assertionIndex]

      // Build hash map for this assertion's evidence (even if empty)
      const evidenceHashMap = await buildEvidenceHashMap(
        assertion.evidence || [],
        sandbox,
      )

      // Cache the assertion if it has evidence OR a reason
      // This ensures we cache failed assertions with reasons even if they have no evidence
      if (Object.keys(evidenceHashMap).length > 0 || assertion.reason) {
        const assertionData = {
          ...(Object.keys(evidenceHashMap).length > 0
            ? { evidence: evidenceHashMap }
            : {}),
          ...(assertion.reason ? { reason: assertion.reason } : {}),
        } as CacheData['steps'][string]['assertions'][string]
        stepData.assertions[assertionIndex.toString()] = assertionData
      }
    }
  }

  return cacheData
}
