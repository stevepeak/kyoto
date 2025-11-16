import {
  Experimental_Agent as Agent,
  Output,
  stepCountIs,
  generateText,
} from 'ai'
import type { DecompositionAgentResult } from './story-decomposition'
import dedent from 'dedent'

import { getDaytonaSandbox } from '../../helpers/daytona'
import { createTerminalCommandTool } from '../../tools/terminal-command-tool'
import { createReadFileTool } from '../../tools/read-file-tool'
import {
  createResolveLibraryTool,
  createGetLibraryDocsTool,
} from '../../tools/context7-tool'
import {
  type TestStatus,
  evaluationOutputSchema,
  type EvaluationOutput,
  type StepMemory,
} from '@app/schemas'
import type { evaluationAgentOptions } from '@app/schemas'
import { logger } from '@trigger.dev/sdk'
import zodToJsonSchema from 'zod-to-json-schema'
import { agents } from '../..'
import { z } from 'zod'

/**
 * Schema for assertion micro-agent output
 * Each assertion micro-agent evaluates a single assertion and produces evidence
 */
const assertionMicroAgentOutputSchema = z.object({
  /**
   * Whether this assertion passes or fails
   */
  conclusion: z.enum(['pass', 'fail']),

  /**
   * The assertion fact being evaluated
   */
  fact: z.string().min(1),

  /**
   * Evidence for this assertion (file paths with line ranges)
   */
  evidence: z
    .array(z.string().min(1))
    .describe(
      'File references with line ranges, e.g., ["src/auth/session.ts:12-28"]',
    ),

  /**
   * Optional domain hints for subsequent assertions in this step
   * These are abstract hints that can help other assertions without repeating work
   */
  domainHints: z
    .object({
      relevantFiles: z
        .array(z.string())
        .optional()
        .describe('File paths that may be relevant to this step'),
      symbolPatterns: z
        .array(z.string())
        .optional()
        .describe('Symbol patterns or class names to watch for'),
      architecturalNotes: z
        .string()
        .optional()
        .describe('Brief architectural or domain context hints'),
    })
    .optional()
    .describe('Optional domain context hints for subsequent assertions'),
})

type AssertionMicroAgentOutput = z.infer<typeof assertionMicroAgentOutputSchema>

/**
 * Step agent output (aggregated from assertion micro-agents)
 * Note: conclusion is simplified to 'pass'/'fail' for internal agent output
 */
type StepAgentOutput = {
  conclusion: 'pass' | 'fail'
  outcome: string
  assertions: Array<{
    fact: string
    evidence: string[]
  }>
}

// Type definitions
type StepContext = {
  stepIndex: number
  step: DecompositionAgentResult['steps'][number]
  previousResults: StepAgentOutput[]
  storyName: string
  storyText: string
  repoOutline: string
}

type AssertionContext = {
  stepIndex: number
  assertionIndex: number
  assertion: string
  stepGoal: string
  stepMemory: StepMemory
  storyName: string
  storyText: string
  repoOutline: string
  previousStepFacts: string[] // Facts from previous steps (givens)
}

// Functions
function buildAssertionMicroAgentInstructions(repoOutline: string): string {
  return `
You are an expert software QA engineer evaluating a SINGLE assertion from a user story step.

# Role & Objective
You are evaluating ONE assertion within a step. Your job is to find concrete code evidence that proves or disproves this specific assertion.

# How to Perform Your Evaluation
1. Focus ONLY on the single assertion provided in the prompt.
2. Use the available tools to search for supporting code evidence for THIS assertion.
3. When you find relevant code, verify it by reading the file contents and understanding the context.
4. Record evidence with precise file paths and line ranges.
5. Consider step memory from previous assertions in this step - you may reference relevant files or patterns discovered earlier.
6. Stop once you have enough verified evidence to reach a confident conclusion about THIS assertion.

# Step Memory
You will receive "step memory" - a summary of evidence and domain hints from previous assertions in this same step. Use this to:
- Avoid repeating heavy search work if relevant files are already identified
- Build on architectural understanding from previous assertions
- Reference symbol patterns that were discovered earlier

However, you must still verify THIS assertion independently - step memory is a hint, not a guarantee.

# Mindset
- False-positives are worse than false-negatives.
- Treat the repository as the single source of truth.
- Only mark this assertion as "passed" when code evidence confirms it is implemented and functionally correct.
- When supporting code is missing, incomplete, or ambiguous, mark the assertion as "failed".
- Evidence must be **executable code**, not just type definitions, comments, or unused utilities.
- Evidence MUST NOT come from test files, e.g., \`src/tests/...\` or \`src/test-utils.ts\`.

# Tools
- **terminalCommand**: Execute read-only shell commands (e.g., \`rg\`, \`fd\`, \`grep\`, etc.) to search for code patterns, files, and symbols.
  - Use this tool ONLY for code search.
- **readFile**: Read the full contents of a file to verify context and extract precise code snippets.
- **resolveLibrary**: Resolve a library/package name to get its Context7 library ID. Use this when you need to understand how a specific library or framework works.
- **getLibraryDocs**: Fetch up-to-date documentation for a library using its Context7 ID. Use this after resolveLibrary to get detailed documentation about APIs, patterns, or features.

# Rules
- Always append a \`.\` when using \`rg\` (e.g., \`rg pattern .\`).
- When verifying code, read 10-20 lines before and after a match to confirm context if needed.
- Use \`resolveLibrary\` and \`getLibraryDocs\` only when local patterns are unclear: resolve the Context7 ID, fetch the docs, and apply them to your evaluation.
- Extract only the **minimum viable snippet** that provides clear evidence, recording precise file paths and line ranges.
- Stop once you have enough verified evidence to reach a confident conclusion.
- Each response must be a JSON object that matches the required schema. Do not include explanations outside of JSON.

# Output Schema
\`\`\`
${JSON.stringify(zodToJsonSchema(assertionMicroAgentOutputSchema), null, 2)}
\`\`\`

# Repository Overview
Use this output to form an initial understanding of the repository layout, infer where relevant code might live, and guide your first searches.

${repoOutline}
`
}

function bulletList(items: string[]): string {
  return items.map((item) => `- ${item}`).join('\n')
}

function buildAssertionPrompt({
  assertionContext,
}: {
  assertionContext: AssertionContext
}): string {
  const { stepMemory, previousStepFacts, assertion, stepGoal } = assertionContext

  const givensSection =
    previousStepFacts.length > 0
      ? dedent`
          # Verified Facts from Previous Steps
          Use these already validated facts as givens when evaluating the assertion below.
          ${bulletList(previousStepFacts)}
        `
      : ''

  const stepMemorySection =
    stepMemory.evidenceSummary.length > 0 ||
    stepMemory.domainHints?.relevantFiles?.length ||
    stepMemory.domainHints?.symbolPatterns?.length ||
    stepMemory.domainHints?.architecturalNotes
      ? dedent`
          # Step Memory (from previous assertions in this step)
          
          ## Evidence Summary
          ${stepMemory.evidenceSummary.length > 0
            ? bulletList(stepMemory.evidenceSummary)
            : 'No evidence collected yet in this step.'}
          
          ${stepMemory.domainHints
            ? dedent`
                ## Domain Hints
                ${stepMemory.domainHints.relevantFiles?.length
                  ? `**Relevant Files:** ${bulletList(stepMemory.domainHints.relevantFiles)}`
                  : ''}
                ${stepMemory.domainHints.symbolPatterns?.length
                  ? `**Symbol Patterns:** ${bulletList(stepMemory.domainHints.symbolPatterns)}`
                  : ''}
                ${stepMemory.domainHints.architecturalNotes
                  ? `**Architectural Notes:** ${stepMemory.domainHints.architecturalNotes}`
                  : ''}
              `
            : ''}
          
          **Note:** You may reference these files/patterns to avoid repeating search work, but you must still verify THIS assertion independently.
        `
      : ''

  const assertionSection = dedent`
    # Goal
    **${stepGoal}**

    # Assertion to Verify
    **${assertion}**

    Evaluate ONLY this assertion. Provide evidence that proves or disproves this specific claim.
  `

  return dedent`
    ${givensSection}
    
    ${stepMemorySection}
    
    ${assertionSection}
    
    Respond only with the required JSON schema once evaluation is complete.
  `
}

/**
 * Merges assertion result into step memory
 */
function mergeAssertionIntoStepMemory(
  currentMemory: StepMemory,
  assertionResult: AssertionMicroAgentOutput,
): StepMemory {
  // Merge evidence
  const newEvidence = [...currentMemory.evidenceSummary, ...assertionResult.evidence]

  // Merge domain hints
  const mergedHints = {
    relevantFiles: [
      ...(currentMemory.domainHints?.relevantFiles || []),
      ...(assertionResult.domainHints?.relevantFiles || []),
    ],
    symbolPatterns: [
      ...(currentMemory.domainHints?.symbolPatterns || []),
      ...(assertionResult.domainHints?.symbolPatterns || []),
    ],
    architecturalNotes: [
      currentMemory.domainHints?.architecturalNotes,
      assertionResult.domainHints?.architecturalNotes,
    ]
      .filter(Boolean)
      .join(' '),
  }

  return {
    evidenceSummary: newEvidence,
    domainHints: {
      relevantFiles: [...new Set(mergedHints.relevantFiles)],
      symbolPatterns: [...new Set(mergedHints.symbolPatterns)],
      architecturalNotes: mergedHints.architecturalNotes || undefined,
    },
  }
}

/**
 * Assertion Micro-Agent - evaluates a single assertion
 * Each assertion gets a fresh agent instance, but receives step memory via prompt
 */
async function assertionMicroAgent(args: {
  assertionContext: AssertionContext
  evaluationAgentOptions: evaluationAgentOptions
  sandbox: Awaited<ReturnType<typeof getDaytonaSandbox>>
}): Promise<AssertionMicroAgentOutput> {
  const {
    assertionContext,
    evaluationAgentOptions: { repo, options },
    sandbox,
  } = args

  const agent = new Agent({
    model: agents.evaluation.options.model,
    system: buildAssertionMicroAgentInstructions(assertionContext.repoOutline),
    tools: {
      terminalCommand: createTerminalCommandTool({ sandbox }),
      readFile: createReadFileTool({ sandbox }),
      resolveLibrary: createResolveLibraryTool(),
      getLibraryDocs: createGetLibraryDocsTool(),
    },
    toolChoice: 'auto',
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'story-assertion-evaluation-v3',
      metadata: {
        storyName: assertionContext.storyName,
        repoId: repo.id,
        repoSlug: repo.slug,
        daytonaSandboxId: options?.daytonaSandboxId ?? '',
        stepIndex: assertionContext.stepIndex,
        assertionIndex: assertionContext.assertionIndex,
      },
      tracer: options?.telemetryTracer,
    },
    onStepFinish: (step) => {
      logger.info(
        `🤖 assertion micro-agent.onStepFinish (step ${assertionContext.stepIndex + 1}, assertion ${assertionContext.assertionIndex + 1})`,
        step,
      )
    },
    maxRetries: 3,
    stopWhen: stepCountIs(
      options?.maxSteps ?? agents.evaluation.options.maxSteps,
    ),
    experimental_output: Output.object({ schema: assertionMicroAgentOutputSchema }),
  })

  const prompt = buildAssertionPrompt({ assertionContext })

  const result = await agent.generate({ prompt })

  logger.log(
    `🌸 Assertion ${assertionContext.assertionIndex + 1} (Step ${assertionContext.stepIndex + 1}) Evaluation Result`,
    {
      assertionContext,
      prompt,
      result,
    },
  )

  // Handle case where agent hit max steps without generating output
  if (!result.experimental_output) {
    const maxStepsUsed = options?.maxSteps ?? agents.evaluation.options.maxSteps
    logger.warn(
      `Assertion ${assertionContext.assertionIndex + 1} (Step ${assertionContext.stepIndex + 1}) hit max steps (${maxStepsUsed}) without generating output`,
    )
    return {
      conclusion: 'fail' as const,
      fact: assertionContext.assertion,
      evidence: [],
      domainHints: undefined,
    }
  }

  return result.experimental_output
}

/**
 * Step Agent - orchestrates assertion micro-agents for a single step
 * Cache breaks at step boundaries (new agent instance per step)
 * Within a step, assertions share step memory but don't reset cache
 */
async function stepAgent(args: {
  stepContext: StepContext
  evaluationAgentOptions: evaluationAgentOptions
  sandbox: Awaited<ReturnType<typeof getDaytonaSandbox>>
}): Promise<StepAgentOutput> {
  const { stepContext, evaluationAgentOptions, sandbox } = args

  // For 'given' steps, return early (no assertions to evaluate)
  if (stepContext.step.type === 'given') {
    return {
      conclusion: 'pass',
      outcome: stepContext.step.given,
      assertions: [],
    }
  }

  // For 'requirement' steps, evaluate each assertion sequentially
  const assertions = stepContext.step.assertions || []
  const assertionResults: AssertionMicroAgentOutput[] = []
  let stepMemory: StepMemory = {
    evidenceSummary: [],
    domainHints: undefined,
  }

  // Collect facts from previous steps (givens)
  const previousStepFacts = stepContext.previousResults.flatMap((prevResult) =>
    prevResult.assertions.map((assertion) => assertion.fact),
  )

  // Evaluate each assertion sequentially with step memory
  for (let assertionIndex = 0; assertionIndex < assertions.length; assertionIndex++) {
    const assertion = assertions[assertionIndex]

    const assertionContext: AssertionContext = {
      stepIndex: stepContext.stepIndex,
      assertionIndex,
      assertion,
      stepGoal: stepContext.step.goal,
      stepMemory,
      storyName: stepContext.storyName,
      storyText: stepContext.storyText,
      repoOutline: stepContext.repoOutline,
      previousStepFacts,
    }

    logger.info(
      `Evaluating assertion ${assertionIndex + 1} of ${assertions.length} in step ${stepContext.stepIndex + 1}`,
      {
        assertion,
        stepMemory,
      },
    )

    const assertionResult = await assertionMicroAgent({
      assertionContext,
      evaluationAgentOptions,
      sandbox,
    })

    assertionResults.push(assertionResult)

    // Merge assertion result into step memory for next assertion
    stepMemory = mergeAssertionIntoStepMemory(stepMemory, assertionResult)
  }

  // Aggregate assertion results into step output
  const stepConclusion: 'pass' | 'fail' = assertionResults.every(
    (result) => result.conclusion === 'pass',
  )
    ? 'pass'
    : 'fail'

  const stepAssertions = assertionResults.map((result) => ({
    fact: result.fact,
    evidence: result.evidence,
  }))

  return {
    conclusion: stepConclusion,
    outcome: stepContext.step.goal,
    assertions: stepAssertions,
  }
}

async function combineStepResults(args: {
  decompositionSteps: DecompositionAgentResult
  analysisStepResults: StepAgentOutput[]
  modelId?: string // TODO implement this later
  cachedRunIds?: Map<string, string> // Map of "stepIndex:assertionIndex" -> runId
}): Promise<EvaluationOutput> {
  const { decompositionSteps, analysisStepResults, cachedRunIds } = args

  // Map decomposition steps with their corresponding analysis results
  const steps = decompositionSteps.steps.map((decompStep, index) => {
    const analysisResult = analysisStepResults[index]

    // Use the original outcome from the decomposition step
    const outcome =
      decompStep.type === 'given' ? decompStep.given : decompStep.goal

    // Add cachedFromRunId to assertions if they were cached
    const assertions = analysisResult.assertions.map(
      (assertion, assertionIndex) => {
        const cacheKey = `${index}:${assertionIndex}`
        const cachedRunId = cachedRunIds?.get(cacheKey)
        return {
          ...assertion,
          ...(cachedRunId ? { cachedFromRunId: cachedRunId } : {}),
        }
      },
    )

    return {
      type: decompStep.type,
      conclusion: analysisResult.conclusion,
      outcome,
      assertions,
    }
  })

  // Determine overall status based on step conclusions
  // Steps can only have 'pass' or 'fail' conclusions
  const status: TestStatus = steps.every((step) => step.conclusion === 'pass')
    ? 'pass'
    : 'fail'

  const stepSummary = steps
    .map((step, idx) => {
      const icon = step.conclusion === 'pass' ? '✅' : '❌'
      return `${icon} Step ${idx + 1} (${step.conclusion}): ${step.outcome}`
    })
    .join('\n')

  // Generate concise explanation using OpenAI
  const { text: explanation } = await generateText({
    model: agents.evaluation.options.model,
    prompt: dedent`
      You are summarizing the results of a story evaluation. Provide a very concise (2-3 sentences max) summary of the evaluation state.

Overall Status: ${status}

Step Results:
${stepSummary}

      Provide a brief, user-friendly explanation of what this evaluation found. Focus on the key outcomes and any issues.
    `,
  })

  return evaluationOutputSchema.parse({
    version: 3,
    status,
    explanation,
    steps,
  })
}

export async function main(
  payload: evaluationAgentOptions,
): Promise<EvaluationOutput> {
  const { story, options } = payload
  const sandbox = await getDaytonaSandbox(options?.daytonaSandboxId ?? '')

  // Cache entry and validation result are passed from test-story.ts
  const cacheEntry = options?.cacheEntry ?? null
  const validationResult = options?.validationResult ?? null
  const cachedRunIds = new Map<string, string>() // Map of "stepIndex:assertionIndex" -> runId

  if (cacheEntry && validationResult) {
    if (validationResult.isValid) {
      logger.info('Cache entry is valid, using cached results', {
        storyId: story.id,
      })
    } else {
      logger.info('Cache entry is invalid, will re-evaluate', {
        storyId: story.id,
        invalidSteps: validationResult.invalidSteps,
        invalidAssertions: validationResult.invalidAssertions,
      })
    }
  }

  // Get repository outline once for all steps
  const repoOutline = await sandbox.process.executeCommand(
    'tree -L 3 -I "dist|build|.git|.next|*.lock|*.log"',
    `workspace/repo`,
  )
  if (repoOutline.exitCode !== 0) {
    throw new Error(`Failed to get repo outline: ${repoOutline.result}`)
  }
  const outline = repoOutline.result ?? ''

  // Process each step sequentially
  // CACHE BREAKS AT STEP LEVEL - each step gets a new agent instance
  const stepResults: StepAgentOutput[] = []
  const steps = (story.decomposition as DecompositionAgentResult).steps

  for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
    const step = steps[stepIndex]

    // Check if this step can use cached results
    if (
      cacheEntry &&
      validationResult &&
      agents.evaluation.options.cacheOptions?.enabled &&
      options?.branchName &&
      options?.runId
    ) {
      // Check if this step is valid in cache
      const stepIsValid =
        validationResult.isValid ||
        !validationResult.invalidSteps.includes(stepIndex)

      if (stepIsValid && step.type === 'requirement') {
        // Check if all assertions for this step are cached and valid
        const stepCacheData = cacheEntry.cacheData.steps[stepIndex.toString()]
        if (stepCacheData) {
          let allAssertionsCached = true
          const cachedAssertions: StepAgentOutput['assertions'] = []

          const stepAssertions = step.assertions || []
          for (const [
            assertionIndex,
            stepAssertion,
          ] of stepAssertions.entries()) {
            const assertionCacheData =
              stepCacheData.assertions[assertionIndex.toString()]

            if (assertionCacheData) {
              // Reconstruct evidence from cached file paths
              const evidence: string[] = []
              for (const filename of Object.keys(assertionCacheData)) {
                // We don't have line ranges in cache, so we'll use just the filename
                // This is acceptable since we're using cached results
                evidence.push(filename)
              }

              cachedAssertions.push({
                fact: stepAssertion || '',
                evidence,
              })

              // Track which run this came from
              if (cacheEntry.runId) {
                cachedRunIds.set(
                  `${stepIndex}:${assertionIndex}`,
                  cacheEntry.runId,
                )
              }
            } else {
              allAssertionsCached = false
              break
            }
          }

          if (allAssertionsCached && cachedAssertions.length > 0) {
            logger.info(
              `Using cached results for step ${stepIndex + 1} of ${steps.length}`,
              {
                stepIndex,
                runId: cacheEntry.runId,
              },
            )

            const stepResult: StepAgentOutput = {
              conclusion: 'pass',
              outcome: step.goal,
              assertions: cachedAssertions,
            }
            stepResults.push(stepResult)
            continue
          }
        }
      }
    }

    const stepContext: StepContext = {
      stepIndex,
      step,
      previousResults: [...stepResults],
      storyName: story.name,
      storyText: story.text,
      repoOutline: outline,
    }

    logger.info(`Evaluating step ${stepIndex + 1} of ${steps.length}`, {
      stepContext,
    })

    // CACHE BREAKS HERE - new step agent instance
    // Within the step, assertions share step memory but don't reset cache
    const stepResult = await stepAgent({
      stepContext,
      evaluationAgentOptions: payload,
      sandbox,
    })

    stepResults.push(stepResult)

    // Early exit if a critical step fails
    // TODO: Determine if we should continue or stop on failure
    // if (stepResult.conclusion === 'error') {
    //   logger.warn(`Step ${stepIndex + 1} encountered an error, continuing...`)
    // }
  }

  // Combine all step results into final evaluation
  const finalResult = await combineStepResults({
    decompositionSteps: story.decomposition as DecompositionAgentResult,
    analysisStepResults: stepResults,
    modelId: options?.modelId,
    cachedRunIds,
  })

  logger.debug('🤖 Evaluation Agent Final Result', {
    stepCount: stepResults.length,
    finalResult,
  })

  return finalResult
}
