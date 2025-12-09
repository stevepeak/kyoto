import { z } from 'zod'

/**
 * ============================================================================
 * STORY DATA FLOW
 * ============================================================================
 *
 * This file documents the complete data flow through the story evaluation
 * system. Data moves through four distinct stages:
 *
 * 1. RAW STORY → User input (Gherkin text)
 * 2. COMPOSITION → AI breaks story into testable steps
 * 3. TEST/EVALUATION → AI evaluates each step with evidence
 * 4. CACHE → Stores file hashes for evidence validation
 *
 * Each stage has:
 * - Input schema (what it receives)
 * - Output schema (what it produces)
 * - Transformation documentation (how data changes)
 *
 * ============================================================================
 * MERMAID FLOW DIAGRAM
 * ============================================================================
 *
 * ```mermaid
 * flowchart TD
 *     Start([User Input]) --> RawInput[Raw Story Input<br/>rawStoryInputSchema<br/>text, title?, id?]
 *
 *     RawInput --> Store[Store in DB<br/>storedStorySchema<br/>stories.story]
 *     Store --> StoredStory[Stored Story<br/>id, repoId, state, metadata]
 *
 *     StoredStory --> Discovery[Story Discovery<br/>File-based discovery]
 *     Discovery --> Discovered[Discovered Story<br/>discoveredStorySchema<br/>title, behavior, dependencies,<br/>acceptanceCriteria, codeReferences]
 *
 *     Discovered --> Composition[Composition Agent<br/>AI breaks into steps]
 *     Composition --> CompOutput[Composition Output<br/>compositionAgentOutputSchema<br/>steps: given | requirement]
 *
 *     Discovered --> CompOutput
 *     CompOutput --> Composed[Composed Story<br/>composedStorySchema<br/>+ composition + embeddings]
 *     Composed --> StoreComp[Store Composition<br/>stories.composition JSONB]
 *
 *     Composed --> EvalInput[Evaluation Input<br/>evaluationInputSchema<br/>repo + story + options]
 *     EvalInput --> Evaluation[Evaluation Agent<br/>AI evaluates steps with evidence]
 *     Evaluation --> EvalOutput[Evaluation Output<br/>evaluationOutputSchema<br/>status, explanation, steps]
 *
 *     EvalOutput --> StepEval[Step Evaluation<br/>stepEvaluationSchema<br/>type, conclusion, outcome, assertions]
 *     StepEval --> Assertion[Assertion Evidence<br/>assertionEvidenceSchema<br/>fact, evidence[], reason?]
 *
 *     EvalOutput --> StoreEval[Store Evaluation<br/>story_test_results.analysis JSONB]
 *
 *     EvalOutput --> CacheTransform[Cache Transformation<br/>Extract file paths<br/>Compute hashes]
 *     CacheTransform --> CacheData[Cache Data<br/>cacheDataSchema<br/>steps: stepIndex → assertions]
 *     CacheData --> CacheEntry[Cache Entry<br/>cacheEntrySchema<br/>branchName, commitSha, cacheData]
 *     CacheEntry --> StoreCache[Store Cache<br/>story_evidence_cache.cache_data JSONB]
 *
 *     StoreCache --> CacheValidation{Cache Validation<br/>Compare file hashes}
 *     CacheValidation -->|Hashes Match| ReuseCache[Reuse Cached Evidence<br/>cachedFromRunId]
 *     CacheValidation -->|Hashes Differ| ReEvaluate[Re-evaluate Step/Assertion]
 *     ReEvaluate --> Evaluation
 *     ReuseCache --> EvalOutput
 *
 *     Store --> Complete[Complete Story Data<br/>CompleteStoryData<br/>raw + composition + evaluation + cache]
 *     StoreComp --> Complete
 *     StoreEval --> Complete
 *     StoreCache --> Complete
 *
 *     style Start fill:#e1f5ff
 *     style RawInput fill:#fff4e1
 *     style StoredStory fill:#fff4e1
 *     style Composed fill:#e8f5e9
 *     style EvalOutput fill:#f3e5f5
 *     style CacheEntry fill:#fff9c4
 *     style Complete fill:#e0f2f1
 *     style CacheValidation fill:#ffebee
 * ```
 *
 * ============================================================================
 */

// ============================================================================
// STAGE 1: RAW STORY
// ============================================================================

/**
 * Raw story input from the user.
 * This is the initial user-provided story text in Gherkin or natural language.
 *
 * NOTE: The `files` field has been removed from stories.
 * Files are discovered during composition and evaluation stages,
 * but are not stored on the story record itself.
 *
 * Example:
 * ```
 * Feature: User Login
 *   As a user
 *   I want to log in with my email and password
 *   So that I can access my account
 *
 *   Scenario: Successful login
 *     Given I am on the login page
 *     When I enter my email and password
 *     Then I should be logged in
 * ```
 */
export const rawStoryInputSchema = z.object({
  /**
   * The raw story text in Gherkin or natural language format
   */
  text: z
    .string()
    .min(1)
    .describe('The user story text in Gherkin or natural language'),

  /**
   * Optional story title/name. If not provided, will be generated.
   */
  title: z
    .string()
    .optional()
    .describe('Story title/name (generated if not provided)'),

  /**
   * Optional story ID if this is an update to an existing story
   */
  id: z
    .string()
    .uuid()
    .optional()
    .describe('Story ID if updating existing story'),
})

export type RawStoryInput = z.infer<typeof rawStoryInputSchema>

/**
 * Raw story as stored in the database.
 * This is the persisted form of the raw story.
 */
const storedStorySchema = rawStoryInputSchema.extend({
  id: z.string().uuid(),
  repoId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  state: z
    .enum(['active', 'generated', 'paused', 'archived', 'planned'])
    .default('active'),
  metadata: z.record(z.unknown()).nullable().optional(),
})

type StoredStory = z.infer<typeof storedStorySchema>

// ============================================================================
// STORY DISCOVERY OUTPUT (File-based discovery)
// ============================================================================

export const compositionStepSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('given'),
    given: z.string().min(1).describe('A precondition that must be true'),
  }),

  z.object({
    type: z.literal('requirement'),
    goal: z
      .string()
      .min(1)
      .describe(
        'Use modal verbs ("can," "should," "may," "must," "is able to") or capability verbs ("allows," "enables," "supports") to describe intended behavior, not observed behavior.',
      ),
    assertions: z
      .array(
        z
          .string()
          .min(1)
          .describe(
            'Declarative, human-readable statements describing what becomes true in this step.',
          ),
      )
      .min(1)
      .describe('List of verifiable assertions for this requirement'),
  }),
])

export type CompositionStep = z.infer<typeof compositionStepSchema>

export const compositionAgentOutputSchema = z.object({
  steps: z
    .array(compositionStepSchema)
    .min(1)
    .describe(
      'A sequential list of steps, each either a given precondition or a requirement with assertions.',
    ),
})

export type CompositionAgentOutput = z.infer<
  typeof compositionAgentOutputSchema
>

export const discoveredStorySchema = z.object({
  title: z.string(),
  behavior: z.string(),
  dependencies: z
    .object({
      entry: z.string().nullable(),
      exit: z.string().nullable(),
      prerequisites: z.array(z.string()).default([]),
      sideEffects: z.array(z.string()).default([]),
    })
    .nullable()
    .default(null),
  acceptanceCriteria: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).default([]),
  codeReferences: z
    .array(
      z.object({
        file: z.string(),
        lines: z.string(),
        description: z.string(),
      }),
    )
    .default([]),
})

export type DiscoveredStory = z.infer<typeof discoveredStorySchema>

// Add in the composition
export const composedStorySchema = discoveredStorySchema.extend({
  composition: compositionAgentOutputSchema,
})

export const discoveryAgentOutputSchema = z.array(composedStorySchema)

export type ComposedStory = z.infer<typeof composedStorySchema>

export type DiscoveryAgentOutput = ComposedStory[]

/**
 * Story discovery output schema for file-based discovery.
 * Returns an array of rich stories with detailed information.
 */
export const storyDiscoveryOutputSchema = z.object({
  stories: z.array(composedStorySchema),
})

export type StoryDiscoveryOutput = z.infer<typeof storyDiscoveryOutputSchema>

/**
 * Story impact output schema.
 * Returns an array of impacted stories with their IDs and scope overlap assessment.
 */
export const storyImpactOutputSchema = z.object({
  stories: z.array(
    z.object({
      id: z.string(),
      scopeOverlap: z.enum(['significant', 'moderate', 'low']),
    }),
  ),
})

export type StoryImpactOutput = z.infer<typeof storyImpactOutputSchema>

/**
 * Diff evaluator output schema.
 * Returns a text explanation and array of impacted stories with file paths and scope overlap assessment.
 */
export const diffEvaluatorOutputSchema = z.object({
  text: z.string().describe('Text explanation of the commit changes'),
  stories: z.array(
    z.object({
      filePath: z.string().describe('Path to the story file in .kyoto/stories'),
      scopeOverlap: z
        .enum(['significant', 'moderate', 'low'])
        .describe('Level of overlap between commit changes and story scope'),
      reasoning: z
        .string()
        .describe('Explanation of why this story is impacted by the commit'),
    }),
  ),
})

export type DiffEvaluatorOutput = z.infer<typeof diffEvaluatorOutputSchema>

// ============================================================================
// STAGE 3: TEST/EVALUATION
// ============================================================================

/**
 * Status of a test evaluation.
 */
export const testStatusSchema = z.enum([
  'pass', // All steps passed
  'fail', // One or more steps failed
  'running', // Evaluation in progress
  'error', // An error occurred during evaluation
  'skipped', // Test was skipped
])

export type TestStatus = z.infer<typeof testStatusSchema>

/**
 * Evidence for a single assertion.
 * Evidence is stored as file paths with line ranges.
 *
 * Example (passing assertion):
 * ```json
 * {
 *   "fact": "The user can create a new team",
 *   "evidence": [
 *     "src/teams/create.ts:45-67",
 *     "src/teams/api.ts:123-145"
 *   ],
 *   "cachedFromRunId": "run_abc123" // Optional: if evidence came from cache
 * }
 * ```
 *
 * Example (failing assertion):
 * ```json
 * {
 *   "fact": "The user can create a new team",
 *   "evidence": [],
 *   "reason": "No evidence found for team creation functionality" // Optional: reason for failure
 * }
 * ```
 * TODO - we need to actually use this assertionEvidenceSchema.parse() to validate the data.
 */
export const assertionEvidenceSchema = z.object({
  /**
   * The assertion fact that this evidence supports
   */
  fact: z.string().min(1).describe('The assertion fact being verified'),

  /**
   * Array of file references with line ranges.
   * Format: "path/to/file.ts:startLine-endLine"
   * Can be empty if the assertion failed and has a reason.
   */
  evidence: z
    .array(z.string().min(1))
    .describe(
      'File references with line ranges, e.g., ["src/auth/session.ts:12-28"]',
    ),

  /**
   * Optional run ID if this evidence was retrieved from cache
   */
  cachedFromRunId: z
    .string()
    .uuid()
    .optional()
    .describe('Run ID if evidence came from cache'),

  /**
   * Optional reason/explanation for why an assertion failed.
   * Only present when the assertion fails.
   */
  reason: z
    .string()
    .min(1)
    .describe('Explanation for why the assertion failed'),
})

export type AssertionEvidence = z.infer<typeof assertionEvidenceSchema>

/**
 * Evaluation result for a single step.
 * This represents whether a step (given or requirement) passed or failed.
 */
export const stepEvaluationSchema = z.object({
  /**
   * The type of step (given or requirement)
   */
  type: z.enum(['given', 'requirement']),

  /**
   * The conclusion for this step
   */
  conclusion: testStatusSchema,

  /**
   * The outcome/goal of this step (for requirements) or the given (for givens)
   */
  outcome: z
    .string()
    .min(1)
    .describe('The goal (requirement) or precondition (given)'),

  /**
   * Evidence for each assertion in this step
   */
  assertions: z.array(assertionEvidenceSchema).min(0),
})

export type StepEvaluation = z.infer<typeof stepEvaluationSchema>

export const evaluationOutputSchema = z.object({
  /**
   * Schema version for future compatibility
   */
  version: z.literal(3),

  /**
   * Overall status of the evaluation
   */
  status: testStatusSchema,

  /**
   * Human-readable explanation of the evaluation results
   */
  explanation: z.string().describe('Explanation of the evaluation results'),

  /**
   * Evaluation results for each step in the composition
   */
  steps: z.array(stepEvaluationSchema).min(1),
})

export type EvaluationOutput = z.infer<typeof evaluationOutputSchema>

export const evaluationInputSchema = z.object({
  repo: z.object({
    id: z.string().uuid(),
    slug: z.string(),
  }),
  story: composedStorySchema,
  options: z
    .object({
      branchName: z.string().optional(),
      runId: z.string().uuid().optional(),
      maxSteps: z.number().int().positive().optional(),
      modelId: z.string().optional(),
    })
    .optional(),
})

export type EvaluationInput = z.infer<typeof evaluationInputSchema>

// ============================================================================
// STAGE 4: CACHE
// ============================================================================

/**
 * Schema for a single assertion cache entry.
 * Stores evidence (file hashes with line ranges) and/or reason for failure.
 */
export const assertionCacheEntrySchema = z.object({
  // Evidence hash map (file paths -> hash and line ranges)
  // Present when assertion has evidence
  evidence: z
    .record(
      z.string(), // filename
      z.object({
        hash: z.string(),
        lineRanges: z.array(z.string()),
      }),
    )
    .optional(),
  // Reason for failure (present when assertion failed)
  reason: z.string().min(1).optional(),
})

export type AssertionCacheEntry = z.infer<typeof assertionCacheEntrySchema>

/**
 * Cache data structure.
 * Stores file hashes, line ranges, and failure reasons for evidence to avoid re-evaluating when files haven't changed.
 *
 * TRANSFORMATION: Evaluation → Cache
 * - Input: Evaluation results (passing and failing assertions)
 * - Output: File hashes, line ranges, and reasons organized by step and assertion
 * - Stored in: story_evidence_cache.cache_data (JSONB)
 *
 * Structure:
 * ```
 * {
 *   steps: {
 *     "0": {                    // Step index
 *       conclusion: "pass" | "fail",
 *       assertions: {
 *         "0": {                // Assertion index
 *           evidence: {        // Optional: present when assertion has evidence
 *             "src/file.ts": {
 *               hash: "abc123hash",
 *               lineRanges: ["12-28", "45-67"]
 *             }
 *           },
 *           reason: "..."      // Optional: present when assertion failed
 *         }
 *       }
 *     }
 *   }
 * }
 * ```
 *
 * Example (passing assertion with evidence):
 * ```json
 * {
 *   "steps": {
 *     "0": {
 *       "conclusion": "pass",
 *       "assertions": {
 *         "0": {
 *           "evidence": {
 *             "src/auth/session.ts": {
 *               "hash": "sha256:abc123...",
 *               "lineRanges": ["12-28"]
 *             }
 *           }
 *         }
 *       }
 *     }
 *   }
 * }
 * ```
 *
 * Example (failing assertion with reason but no evidence):
 * ```json
 * {
 *   "steps": {
 *     "1": {
 *       "conclusion": "fail",
 *       "assertions": {
 *         "0": {
 *           "reason": "No evidence found for team creation functionality"
 *         }
 *       }
 *     }
 *   }
 * }
 * ```
 */
export const cacheDataSchema = z.object({
  steps: z.record(
    z.string().regex(/^\d+$/), // Step index as string
    z.object({
      conclusion: z.enum(['pass', 'fail']),
      assertions: z.record(
        z.string().regex(/^\d+$/), // Assertion index as string
        assertionCacheEntrySchema,
      ),
    }),
  ),
})

export type CacheData = z.infer<typeof cacheDataSchema>

/**
 * Cache entry schema.
 * This represents a complete cache entry stored in the database.
 */
export const cacheEntrySchema = z.object({
  id: z.string().uuid(),
  branchName: z.string(),
  storyId: z.string().uuid(),
  commitSha: z.string(),
  cacheData: cacheDataSchema,
  runId: z.string().uuid().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type CacheEntry = z.infer<typeof cacheEntrySchema>

/**
 * Cache validation result.
 * Indicates which steps/assertions are still valid based on file hash comparison.
 */
export const cacheValidationResultSchema = z.object({
  /**
   * Whether the entire cache entry is valid
   */
  isValid: z.boolean(),

  /**
   * Step indices that are invalid (if invalidation strategy is 'step')
   */
  invalidSteps: z.array(z.number().int().nonnegative()),

  /**
   * Specific assertion indices that are invalid
   */
  invalidAssertions: z.array(
    z.object({
      stepIndex: z.number().int().nonnegative(),
      assertionIndex: z.number().int().nonnegative(),
    }),
  ),
})

export type CacheValidationResult = z.infer<typeof cacheValidationResultSchema>

// ============================================================================
// DATA FLOW SUMMARY
// ============================================================================

/**
 * Complete data flow through the system:
 *
 * 1. RAW STORY
 *    Input: User provides story text
 *    Schema: rawStoryInputSchema
 *    Storage: stories.story (text), stories.name (title)
 *
 * 2. COMPOSITION
 *    Input: Raw story text
 *    Process: AI agent breaks story into steps
 *    Output: compositionAgentOutputSchema
 *    Storage: stories.composition (JSONB)
 *
 * 3. TEST/EVALUATION
 *    Input: Raw story + Composition
 *    Process: AI agent evaluates each step, finds evidence
 *    Output: evaluationOutputSchema
 *    Storage: story_test_results.analysis (JSONB)
 *
 * 4. CACHE
 *    Input: Evaluation results (passing assertions only)
 *    Process: Extract file paths, compute hashes
 *    Output: cacheDataSchema
 *    Storage: story_evidence_cache.cache_data (JSONB)
 *
 * CACHE VALIDATION:
 *    - On subsequent runs, compare current file hashes with cached hashes
 *    - If hashes match, reuse cached evidence
 *    - If hashes differ, re-evaluate that step/assertion
 */

// ============================================================================
// TYPE EXPORTS FOR CONVENIENCE
// ============================================================================

/**
 * Complete story data including all stages.
 * This represents a story with its composition, evaluation, and cache.
 */
export type CompleteStoryData = {
  raw: StoredStory
  composition: CompositionAgentOutput | null
  evaluation: EvaluationOutput | null
  cache: CacheEntry | null
}
