import type { StoryTestResult, RunStory, Run } from '../types'

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

export function normalizeStoryResultStatus(
  status: unknown,
): StoryTestResult['status'] {
  return STORY_RESULT_STATUS_VALUES.includes(
    status as StoryTestResult['status'],
  )
    ? (status as StoryTestResult['status'])
    : 'error'
}

export function normalizeRunStoryStatus(status: unknown): RunStory['status'] {
  return RUN_STORY_STATUS_VALUES.includes(status as RunStory['status'])
    ? (status as RunStory['status'])
    : 'error'
}

export function normalizeRunStatus(status: unknown): Run['status'] {
  return RUN_STATUS_VALUES.includes(status as Run['status'])
    ? (status as Run['status'])
    : 'error'
}

export function toIsoString(value: unknown): string | null {
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
