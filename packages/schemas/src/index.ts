/**
 * ============================================================================
 * SCHEMAS PACKAGE - MAIN EXPORTS
 * ============================================================================
 *
 * This package provides Zod schemas for the complete story evaluation flow:
 *
 * 1. Raw Story → User input
 * 2. Decomposition → AI breaks story into steps
 * 3. Test/Evaluation → AI evaluates steps with evidence
 * 4. Cache → Stores file hashes for evidence validation
 *
 * See story-flow.ts for complete documentation of the data flow.
 */

// ============================================================================
// STORY FLOW SCHEMAS (Complete data flow documentation)
// ============================================================================

export {
  // Raw Story
  rawStoryInputSchema,
  rawStorySchema,
  type RawStoryInput,
  type RawStory,

  // Decomposition
  decompositionStepSchema,
  decompositionOutputSchema,
  decompositionInputSchema,
  type DecompositionStep,
  type DecompositionOutput,
  type DecompositionInput,

  // Test/Evaluation
  testStatusSchema,
  assertionEvidenceSchema,
  stepEvaluationSchema,
  evaluationOutputSchema,
  evaluationInputSchema,
  type TestStatus,
  type AssertionEvidence,
  type StepEvaluation,
  type EvaluationOutput,
  type EvaluationInput,

  // Cache
  assertionCacheEntrySchema,
  cacheDataSchema,
  cacheEntrySchema,
  cacheValidationResultSchema,
  type AssertionCacheEntry,
  type CacheData,
  type CacheEntry,
  type CacheValidationResult,

  // Complete story data
  type CompleteStoryData,
} from './story-flow'

// ============================================================================
// AGENT TYPES (Agent-specific configuration types)
// ============================================================================

export {
  type CacheEntry as AgentCacheEntry, // Re-exported for clarity
  type ValidationResult,
  type evaluationAgentOptions,
  type Commit,
} from './agent-types'
