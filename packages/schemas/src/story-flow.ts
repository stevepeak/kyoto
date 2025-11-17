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
 * 2. DECOMPOSITION → AI breaks story into testable steps
 * 3. TEST/EVALUATION → AI evaluates each step with evidence
 * 4. CACHE → Stores file hashes for evidence validation
 *
 * Each stage has:
 * - Input schema (what it receives)
 * - Output schema (what it produces)
 * - Transformation documentation (how data changes)
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
 * Files are discovered during decomposition and evaluation stages,
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
export const rawStorySchema = rawStoryInputSchema.extend({
  id: z.string().uuid(),
  repoId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  state: z.enum(['active', 'generated', 'paused', 'archived', 'planned', 'processing']).default('active'),
  metadata: z.record(z.unknown()).nullable().optional(),
})

export type RawStory = z.infer<typeof rawStorySchema>

// ============================================================================
// STAGE 2: DECOMPOSITION
// ============================================================================

/**
 * A single step in the decomposition.
 * Steps can be either:
 * - "given": A precondition that must be true before evaluation
 * - "requirement": A requirement with a goal and assertions
 */
export const decompositionStepSchema = z.discriminatedUnion('type', [
  /**
   * A precondition step (Given).
   * Represents a state that must be true before evaluating requirements.
   *
   * Example:
   * ```json
   * {
   *   "type": "given",
   *   "given": "The user is logged in with an active session"
   * }
   * ```
   */
  z.object({
    type: z.literal('given'),
    given: z.string().min(1).describe('A precondition that must be true'),
  }),

  /**
   * A requirement step (eg,. When/Then/And).
   * Represents a requirement with a goal and verifiable assertions.
   *
   * Example:
   * ```json
   * {
   *   "type": "requirement",
   *   "goal": "User can create a new team",
   *   "assertions": [
   *     "The user can create a new team",
   *     "The new team is created and appears in the user's team list"
   *   ]
   * }
   * ```
   */
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

export type DecompositionStep = z.infer<typeof decompositionStepSchema>

/**
 * Decomposition output schema.
 * This is the result of the decomposition agent breaking down a raw story
 * into testable steps.
 *
 * TRANSFORMATION: Raw Story → Decomposition
 * - Input: Raw story text (string)
 * - Output: Structured steps with preconditions and requirements
 * - Stored in: stories.decomposition (JSONB)
 *
 * Example:
 * ```json
 * {
 *   "steps": [
 *     {
 *       "type": "given",
 *       "given": "The user is logged in"
 *     },
 *     {
 *       "type": "requirement",
 *       "goal": "User can create a new team",
 *       "assertions": [
 *         "The user can create a new team",
 *         "The new team appears in the user's team list"
 *       ]
 *     }
 *   ]
 * }
 * ```
 */
export const decompositionOutputSchema = z.object({
  steps: z
    .array(decompositionStepSchema)
    .min(1)
    .describe(
      'A sequential list of steps, each either a given precondition or a requirement with assertions.',
    ),
})

export type DecompositionOutput = z.infer<typeof decompositionOutputSchema>

/**
 * Decomposition input for the decomposition agent.
 * This is what gets passed to the decomposition agent.
 */
export const decompositionInputSchema = z.object({
  story: z.object({
    id: z.string().uuid().optional(),
    text: z.string().min(1),
    title: z.string().optional(),
  }),
  repo: z.object({
    id: z.string().uuid(),
    slug: z.string(),
  }),
})

export type DecompositionInput = z.infer<typeof decompositionInputSchema>

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
 * Example:
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
 */
export const assertionEvidenceSchema = z.object({
  /**
   * The assertion fact that this evidence supports
   */
  fact: z.string().min(1).describe('The assertion fact being verified'),

  /**
   * Array of file references with line ranges.
   * Format: "path/to/file.ts:startLine-endLine"
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

/**
 * Evaluation output schema.
 * This is the result of the evaluation agent testing each step of the decomposition.
 *
 * TRANSFORMATION: Decomposition → Evaluation
 * - Input: Raw Story + Decomposition
 * - Output: Evaluation results with status, explanation, and evidence for each step
 * - Stored in: story_test_results.analysis (JSONB)
 *
 * Example:
 * ```json
 * {
 *   "version": 3,
 *   "status": "pass",
 *   "explanation": "All steps were successfully verified...",
 *   "steps": [
 *     {
 *       "type": "given",
 *       "conclusion": "pass",
 *       "outcome": "The user is logged in",
 *       "assertions": [
 *         {
 *           "fact": "The user is logged in",
 *           "evidence": ["src/auth/session.ts:12-28"]
 *         }
 *       ]
 *     },
 *     {
 *       "type": "requirement",
 *       "conclusion": "pass",
 *       "outcome": "User can create a new team",
 *       "assertions": [
 *         {
 *           "fact": "The user can create a new team",
 *           "evidence": ["src/teams/create.ts:45-67"]
 *         }
 *       ]
 *     }
 *   ]
 * }
 * ```
 */
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
  explanation: z
    .string()
    .min(1)
    .describe('Explanation of the evaluation results'),

  /**
   * Evaluation results for each step in the decomposition
   */
  steps: z.array(stepEvaluationSchema).min(1),
})

export type EvaluationOutput = z.infer<typeof evaluationOutputSchema>

/**
 * Evaluation input for the evaluation agent.
 * This is what gets passed to the evaluation agent.
 */
export const evaluationInputSchema = z.object({
  repo: z.object({
    id: z.string().uuid(),
    slug: z.string(),
  }),
  story: z.object({
    id: z.string().uuid(),
    name: z.string(),
    text: z.string().min(1),
    decomposition: decompositionOutputSchema,
  }),
  options: z
    .object({
      daytonaSandboxId: z.string().optional(),
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
 * Cache data structure.
 * Stores file hashes for evidence to avoid re-evaluating when files haven't changed.
 *
 * TRANSFORMATION: Evaluation → Cache
 * - Input: Evaluation results (only passing assertions)
 * - Output: File hashes organized by step and assertion
 * - Stored in: story_evidence_cache.cache_data (JSONB)
 *
 * Structure:
 * ```
 * {
 *   steps: {
 *     "0": {                    // Step index
 *       assertions: {
 *         "0": {                // Assertion index
 *           "src/file.ts": "abc123hash",  // filename -> hash
 *           "src/other.ts": "def456hash"
 *         }
 *       }
 *     }
 *   }
 * }
 * ```
 *
 * Example:
 * ```json
 * {
 *   "steps": {
 *     "0": {
 *       "assertions": {
 *         "0": {
 *           "src/auth/session.ts": "sha256:abc123...",
 *           "src/auth/middleware.ts": "sha256:def456..."
 *         }
 *       }
 *     },
 *     "1": {
 *       "assertions": {
 *         "0": {
 *           "src/teams/create.ts": "sha256:ghi789..."
 *         },
 *         "1": {
 *           "src/teams/api.ts": "sha256:jkl012..."
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
      assertions: z.record(
        z.string().regex(/^\d+$/), // Assertion index as string
        z.record(z.string(), z.string()), // filename -> hash
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
 * 2. DECOMPOSITION
 *    Input: Raw story text
 *    Process: AI agent breaks story into steps
 *    Output: decompositionOutputSchema
 *    Storage: stories.decomposition (JSONB)
 *
 * 3. TEST/EVALUATION
 *    Input: Raw story + Decomposition
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
 * This represents a story with its decomposition, evaluation, and cache.
 */
export type CompleteStoryData = {
  raw: RawStory
  decomposition: DecompositionOutput | null
  evaluation: EvaluationOutput | null
  cache: CacheEntry | null
}
