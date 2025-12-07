import { type Tracer } from '@opentelemetry/api'

import {
  type CacheEntry,
  type CacheValidationResult,
  type ComposedStory,
} from './story-flow.js'

/**
 * Re-export cache types for agent usage
 * These are the same types defined in story-flow.ts
 */
export type { CacheEntry, CacheValidationResult as ValidationResult }

/**
 * Commit information containing message, code diff, and changed files
 * Used throughout the story discovery and analysis pipeline
 */
export interface Commit {
  /** Commit message(s) - can be a single message or multiple joined with newlines */
  message: string
  /** Code diff showing the changes */
  diff: string
  /** Array of file paths that were changed */
  changedFiles: string[]
}

/**
 * Options for the evaluation agent
 * Note: composition type is imported from @app/agents at usage sites to avoid circular dependency
 */
export type EvaluationAgentOptions = {
  repo: {
    id: string
    slug: string
  }
  story: ComposedStory
  options?: {
    /** Maximum number of steps to take */
    maxSteps?: number
    /** Model ID to use like "gpt-5-mini" */
    modelId?: string
    /** Daytona Sandbox ID to use */
    daytonaSandboxId?: string
    telemetryTracer?: Tracer
    /** Branch name for cache lookup */
    branchName?: string
    /** Run ID for cache metadata */
    runId?: string
    /** Cache entry and validation result (set by test-story.ts) */
    cacheEntry?: CacheEntry | null
    validationResult?: CacheValidationResult | null
  }
}
