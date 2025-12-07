/**
 * ============================================================================
 * SCHEMAS PACKAGE - MAIN EXPORTS
 * ============================================================================
 *
 * This package provides Zod schemas for the complete story evaluation flow:
 *
 * 1. Raw Story → User input
 * 2. Composition → AI breaks story into steps
 * 3. Test/Evaluation → AI evaluates steps with evidence
 * 4. Cache → Stores file hashes for evidence validation
 *
 * See story-flow.ts for complete documentation of the data flow.
 */

// ============================================================================
// STORY FLOW SCHEMAS (Complete data flow documentation)
// ============================================================================

export {
  type AssertionCacheEntry,
  // Cache
  assertionCacheEntrySchema,
  type AssertionEvidence,
  assertionEvidenceSchema,
  type CacheData,
  cacheDataSchema,
  type CacheEntry,
  cacheEntrySchema,
  type CacheValidationResult,
  cacheValidationResultSchema,
  // Complete story data
  type CompleteStoryData,
  type ComposedStory,
  // Story Discovery
  composedStorySchema,
  type CompositionAgentOutput,
  compositionAgentOutputSchema,
  type CompositionStep,
  // Composition
  compositionStepSchema,
  type DiffEvaluatorOutput,
  diffEvaluatorOutputSchema,
  type DiscoveredStory,
  discoveredStorySchema,
  type DiscoveryAgentOutput,
  discoveryAgentOutputSchema,
  type EvaluationInput,
  evaluationInputSchema,
  type EvaluationOutput,
  evaluationOutputSchema,
  type RawStoryInput,

  // Raw Story
  rawStoryInputSchema,
  type StepEvaluation,
  stepEvaluationSchema,
  type StoryDiscoveryOutput,
  storyDiscoveryOutputSchema,
  type StoryImpactOutput,
  storyImpactOutputSchema,
  type TestStatus,

  // Test/Evaluation
  testStatusSchema,
} from './story-flow.js'

// ============================================================================
// AGENT TYPES (Agent-specific configuration types)
// ============================================================================

export {
  type CacheEntry as AgentCacheEntry, // Re-exported for clarity
  type Commit,
  type evaluationAgentOptions,
  type ValidationResult,
} from './agent-types.js'
