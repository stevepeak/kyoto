import type { BrowserTestSuggestion } from '@app/agents'

export type StreamItem =
  | { type: 'log'; text: string; color?: string; dim?: boolean }
  | { type: 'agent'; text: string }
  | { type: 'test-result'; description: string; passed: boolean }
  | { type: 'divider' }

export type TestStatus = 'pending' | 'selected' | 'running' | 'pass' | 'fail'

/**
 * Stage 1: Waiting for file changes
 * Stage 2: Evaluating changes to create test plan
 * Stage 3: Awaiting user input (test plan displayed)
 * Stage 4: Executing test plan
 */
export type Stage =
  | { type: 'initializing'; text: string }
  | { type: 'waiting' }
  | { type: 'evaluating' }
  | { type: 'awaiting-input'; tests: BrowserTestSuggestion[] }
  | { type: 'executing'; tests: BrowserTestSuggestion[] }
