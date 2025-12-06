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
  // Raw Story
  rawStoryInputSchema,
  discoveredStorySchema,
  type RawStoryInput,
  type DiscoveredStory,
  type DiscoveryAgentOutput,

  // Story Discovery
  composedStorySchema,
  storyDiscoveryOutputSchema,
  storyImpactOutputSchema,
  type ComposedStory,
  type StoryDiscoveryOutput,
  type StoryImpactOutput,
  discoveryAgentOutputSchema,

  // Composition
  compositionStepSchema,
  compositionAgentOutputSchema,
  type CompositionStep,
  type CompositionAgentOutput,

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
} from './story-flow.js'

// ============================================================================
// AGENT TYPES (Agent-specific configuration types)
// ============================================================================

export {
  type CacheEntry as AgentCacheEntry, // Re-exported for clarity
  type ValidationResult,
  type evaluationAgentOptions,
  type Commit,
} from './agent-types.js'
