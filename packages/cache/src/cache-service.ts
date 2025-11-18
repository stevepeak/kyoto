import { sql, eq, and, inArray } from 'drizzle-orm'
import type { DB } from '@app/db'
import { storyEvidenceCache } from '@app/db/schema'
import type { CacheEntry, CacheData, ValidationResult } from '@app/schemas'
import { buildEvidenceHashMap, getFileHashFromSandbox } from './cache-evidence'
import type { Sandbox } from '@daytonaio/sdk'

/**
 * Retrieves cached evidence for a story at a specific commit SHA or from a list of commit SHAs.
 * When multiple commit SHAs are provided, returns the cache entry for the latest commit SHA
 * (first in the array, as git log returns commits in chronological order latest-first).
 */
export async function getCachedEvidence(args: {
  db: DB
  storyId: string
  commitSha: string | string[]
}): Promise<CacheEntry | null> {
  const { db, storyId, commitSha } = args

  // Handle single commit SHA (backward compatibility)
  if (typeof commitSha === 'string') {
    const result = await db
      .select()
      .from(storyEvidenceCache)
      .where(
        and(
          eq(storyEvidenceCache.storyId, storyId),
          eq(storyEvidenceCache.commitSha, commitSha),
        ),
      )
      .limit(1)

    if (!result[0]) {
      return null
    }

    const entry = result[0]
    return {
      id: entry.id,
      branchName: entry.branchName,
      storyId: entry.storyId,
      commitSha: entry.commitSha,
      cacheData: entry.cacheData as CacheData,
      runId: entry.runId,
      createdAt: entry.createdAt ?? new Date(),
      updatedAt: entry.updatedAt ?? new Date(),
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
    .select()
    .from(storyEvidenceCache)
    .where(
      and(
        eq(storyEvidenceCache.storyId, storyId),
        inArray(storyEvidenceCache.commitSha, commitSha),
      ),
    )
    .orderBy(
      sql`CASE ${storyEvidenceCache.commitSha} ${sql.raw(orderByCases)} END`,
    )
    .limit(1)

  if (!result[0]) {
    return null
  }

  const entry = result[0]
  return {
    id: entry.id,
    branchName: entry.branchName,
    storyId: entry.storyId,
    commitSha: entry.commitSha,
    cacheData: entry.cacheData as CacheData,
    runId: entry.runId,
    createdAt: entry.createdAt ?? new Date(),
    updatedAt: entry.updatedAt ?? new Date(),
  }
}

/**
 * Saves cached evidence for a story at a specific commit SHA
 */
export async function saveCachedEvidence(args: {
  db: DB
  branchName: string
  storyId: string
  commitSha: string
  cacheData: CacheData
  runId: string
}): Promise<void> {
  const { db, branchName, storyId, commitSha, cacheData, runId } = args

  await db
    .insert(storyEvidenceCache)
    .values({
      branchName,
      storyId,
      commitSha,
      cacheData: cacheData as any,
      runId,
    })
    .onConflictDoNothing({
      target: [storyEvidenceCache.storyId, storyEvidenceCache.commitSha],
    })
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
  const { cacheEntry, sandbox, invalidationStrategy } = args

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
    for (const [assertionIndexStr, evidenceHashMap] of Object.entries(
      stepData.assertions,
    )) {
      const assertionIndex = Number.parseInt(assertionIndexStr, 10)

      // Check each file hash in the cached evidence
      let assertionIsValid = true
      for (const [filename, cacheEntry] of Object.entries(evidenceHashMap)) {
        try {
          // Handle both old format (string hash) and new format (object with hash and lineRanges)
          const cachedHash =
            typeof cacheEntry === 'string' ? cacheEntry : cacheEntry.hash

          const currentHash = await getFileHashFromSandbox(sandbox, filename)
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
  db: DB
  storyId: string
  commitSha: string
}): Promise<void> {
  const { db, storyId, commitSha } = args

  await db
    .delete(storyEvidenceCache)
    .where(
      and(
        eq(storyEvidenceCache.storyId, storyId),
        eq(storyEvidenceCache.commitSha, commitSha),
      ),
    )
}

/**
 * Invalidates all cache entries for a story (across all branches)
 * Used when decomposition changes
 */
export async function invalidateCacheForStory(args: {
  db: DB
  storyId: string
}): Promise<void> {
  const { db, storyId } = args

  await db
    .delete(storyEvidenceCache)
    .where(eq(storyEvidenceCache.storyId, storyId))
}

/**
 * Builds cache data from evaluation results
 * Includes both passing and failing steps (but not errors)
 */
export async function buildCacheDataFromEvaluation(args: {
  evaluation: {
    steps: Array<{
      conclusion: string
      assertions: Array<{
        evidence: string[]
      }>
    }>
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

    cacheData.steps[stepIndex.toString()] = {
      conclusion: step.conclusion,
      assertions: {},
    }

    for (
      let assertionIndex = 0;
      assertionIndex < step.assertions.length;
      assertionIndex++
    ) {
      const assertion = step.assertions[assertionIndex]

      // Build hash map for this assertion's evidence
      const evidenceHashMap = await buildEvidenceHashMap(
        assertion.evidence,
        sandbox,
      )

      // Only cache if we have evidence
      if (Object.keys(evidenceHashMap).length > 0) {
        cacheData.steps[stepIndex.toString()].assertions[
          assertionIndex.toString()
        ] = evidenceHashMap
      }
    }
  }

  return cacheData
}
