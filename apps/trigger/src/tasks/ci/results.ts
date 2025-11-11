import { json } from '@app/db'
import type { RunStory, StoryAnalysisV1 } from '@app/db'
import { z } from 'zod'
import type { AggregatedCounts } from '../../helpers/github-checks'
import type { DbClient, StoryRow } from './types'
import type { BatchTriggerResult } from './sandbox'

export interface AggregatedRunOutcome {
  aggregated: AggregatedCounts
  updatedRunStories: RunStory[]
  finalStatus: 'pass' | 'fail' | 'skipped' | 'error'
  summaryText: string
  summaryParts: string[]
}

export function aggregateBatchResults({
  batchResult,
  stories,
  initialRunStories,
}: {
  batchResult: BatchTriggerResult
  stories: StoryRow[]
  initialRunStories: RunStory[]
}): AggregatedRunOutcome {
  const aggregated: AggregatedCounts = {
    pass: 0,
    fail: 0,
    error: 0,
  }
  const updatedRunStories: RunStory[] = []

  batchResult.runs.forEach((result, index) => {
    const story = stories[index]

    if (!story) {
      return
    }

    if (result.ok) {
      // Validate the output structure with Zod instead of unsafe type assertion
      const storyTestOutputSchema = z.object({
        resultId: z.string(),
        status: z.enum(['pass', 'fail', 'running', 'error']),
        analysisVersion: z.number(),
        analysis: z.custom<StoryAnalysisV1 | null>().nullable(),
      })

      const output = storyTestOutputSchema.parse(result.output)

      if (output.status === 'pass') {
        aggregated.pass += 1
      } else if (output.status === 'fail') {
        aggregated.fail += 1
      } else if (output.status === 'error') {
        aggregated.error += 1
      }

      updatedRunStories.push({
        storyId: story.id,
        status: output.status,
        resultId: output.resultId,
        summary: null,
        startedAt: initialRunStories[index]?.startedAt ?? null,
        completedAt: new Date().toISOString(),
      })
    } else {
      aggregated.error += 1
      // Simplify error message extraction with proper type guard
      const errorMessage = extractErrorMessage(result.error)

      updatedRunStories.push({
        storyId: story.id,
        status: 'error',
        resultId: null,
        summary: errorMessage,
        startedAt: initialRunStories[index]?.startedAt ?? null,
        completedAt: new Date().toISOString(),
      })
    }
  })

  const totalStories = stories.length
  const finalStatus = determineFinalStatus(aggregated, totalStories)
  const summaryParts = buildSummaryParts(aggregated)
  const summaryText = summaryParts.join(', ')

  return {
    aggregated,
    updatedRunStories,
    finalStatus,
    summaryText,
    summaryParts,
  }
}

function determineFinalStatus(
  aggregated: AggregatedCounts,
  totalStories: number,
): 'pass' | 'fail' | 'skipped' | 'error' {
  if (aggregated.error > 0) {
    return 'error'
  }

  if (aggregated.fail > 0) {
    return 'fail'
  }

  if (aggregated.pass === totalStories && totalStories > 0) {
    return 'pass'
  }

  return 'skipped'
}

function buildSummaryParts(aggregated: AggregatedCounts): string[] {
  return [
    `${aggregated.pass} passed`,
    `${aggregated.fail} failed`,
    `${aggregated.error} errors`,
  ]
}

/**
 * Extracts error message from unknown error type with proper type guards
 */
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }

  return 'Evaluation failed'
}

export async function updateRunResults({
  db,
  runId,
  finalStatus,
  summaryText,
  updatedRunStories,
}: {
  db: DbClient
  runId: string
  finalStatus: 'pass' | 'fail' | 'skipped' | 'error'
  summaryText: string
  updatedRunStories: RunStory[]
}): Promise<void> {
  await db
    .updateTable('runs')
    .set({
      status: finalStatus,
      summary: summaryText,
      stories: json(updatedRunStories),
    })
    .where('id', '=', runId)
    .execute()
}

export async function markRunFailure({
  db,
  runId,
  summary,
  status = 'fail',
}: {
  db: DbClient
  runId: string
  summary: string
  status?: 'fail' | 'error'
}): Promise<void> {
  await db
    .updateTable('runs')
    .set({
      status,
      summary,
    })
    .where('id', '=', runId)
    .execute()
}
