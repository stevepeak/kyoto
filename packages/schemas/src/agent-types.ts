import type { Tracer } from '@opentelemetry/api'
import type { CacheEntry, CacheValidationResult } from './story-flow'

/**
 * Re-export cache types for agent usage
 * These are the same types defined in story-flow.ts
 */
export type { CacheEntry, CacheValidationResult as ValidationResult }

/**
 * Options for the evaluation agent
 * Note: decomposition type is imported from @app/agents at usage sites to avoid circular dependency
 */
export type evaluationAgentOptions = {
  repo: {
    id: string
    slug: string
  }
  story: {
    id: string
    name: string
    text: string
    /**
     * Decomposition output from the decomposition agent.
     * Type is DecompositionOutput from story-flow.ts, but imported at usage sites
     * to avoid circular dependencies.
     * Using `any` here to allow flexibility at usage sites where the actual type is imported.
     */
    decomposition: any
  }
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
