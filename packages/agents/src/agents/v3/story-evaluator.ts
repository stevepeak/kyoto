import {
  Experimental_Agent as Agent,
  Output,
  stepCountIs,
  generateText,
} from 'ai'
import { dedent } from 'ts-dedent'

import {
  type TestStatus,
  evaluationOutputSchema,
  type EvaluationOutput,
  assertionEvidenceSchema,
  assertionCacheEntrySchema,
} from '@app/schemas'
import type {
  CompositionAgentOutput,
  CompositionStep,
  evaluationAgentOptions,
} from '@app/schemas'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { agents } from '../../index.js'
import { z } from 'zod'

/**
 * Schema for agent output (step evaluation result)
 * Uses assertionEvidenceSchema from @app/schemas for assertions
 * Note: conclusion is simplified to 'pass'/'fail' for internal agent output
 */
const stepAgentOutputSchema = z.object({
  conclusion: z.enum(['pass', 'fail']),
  outcome: z.string().min(1),
  assertions: z.array(
    // Use assertionEvidenceSchema but omit cachedFromRunId (added later)
    assertionEvidenceSchema.omit({ cachedFromRunId: true }),
  ),
})

type StepAgentOutput = z.infer<typeof stepAgentOutputSchema>

type StepContext = {
  stepIndex: number
  step: CompositionStep
  previousResults: StepAgentOutput[]
  storyName: string
  storyText: string
  repoOutline: string
}

// Functions
function buildEvaluationInstructions(repoOutline: string): string {
  return `
You are an expert software QA engineer evaluating whether a specific step from a user story is properly implemented given the current repository state.

# Role & Objective
You are evaluating a SINGLE step from a composed user story. Start with no assumptions that this step is implemented correctly. 
You must discover evidence by gathering, searching, and evaluating source code to make a well-educated conclusion about whether this specific step is properly and fully implemented.

# How to Perform Your Evaluation
1. Focus ONLY on the current step provided in the prompt.
2. Use the available tools to search for supporting code evidence for THIS step's assertions.
3. When you find relevant code, verify it by reading the file contents and understanding the context.
4. Record each piece of evidence with precise file paths and line ranges.
5. Consider context from previous steps if provided, but focus your evaluation on the current step.
6. Stop once you have enough verified evidence to reach a confident conclusion about each of THIS step's assertions.

# Mindset
- False-positives are worse than false-negatives.
- Treat the repository as the single source of truth.
- Only mark this step as "passed" when code evidence confirms it is implemented and functionally correct.
- When supporting code is missing, incomplete, or ambiguous, mark the step as "failed" and explain what is missing.
- Evidence must be **executable code**, not just type definitions, comments, or unused utilities.
- If previous step results are provided, you may reference their evidence but must verify the current step independently.
- When a step depends on another, you may reference previous step evidence but must still verify the current step's implementation.

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
- Explanation should clearly state why the story passes or fails. Use concise language that a human reviewer can follow quickly.
- Keep it short, factual, and time-ordered.
- Output summaries in Markdown format, embedded in the JSON object, so they render cleanly for humans.
- Each response must be a JSON object that matches the required schema. Do not include explanations outside of JSON.
- Evidence MUST NOT come from test files, e.g., \`src/tests/...\` or \`src/test-utils.ts\`.

# Output Schema
\`\`\`
${JSON.stringify(zodToJsonSchema(stepAgentOutputSchema), null, 2)}
\`\`\`

# Repository Overview
Use this output to form an initial understanding of the repository layout, infer where relevant code might live, and guide your first searches.

${repoOutline}
`
}

function bulletList(items: string[]): string {
  return items.map((item) => `- ${item}`).join('\n')
}

function buildStepPrompt({
  stepContext,
}: {
  stepContext: StepContext
}): string {
  // Collect facts (steps[].assertions[].fact)
  const facts = stepContext.previousResults.flatMap((prevResult) =>
    prevResult.assertions.map((assertion) => assertion.fact),
  )

  const givensSection =
    facts.length > 0
      ? dedent`
          # Verified Facts
          Use these already validated facts as givens in when evaluating the requirement below.
          ${bulletList(facts)}
        `
      : ''

  const requirementSection =
    stepContext.step.type === 'requirement'
      ? dedent`
          # Goal
          **${stepContext.step.goal}**

          To verify is this goal is acheivable you must verify the following assertion:
          ${bulletList(stepContext.step.assertions)}

          Do not come up with more assertions, this is the complete list to verify and provide evidence for.
        `
      : ''

  return dedent`
    ${givensSection}

    ${requirementSection}

    Respond only with the required JSON schema once evaluation is complete.
  `
}

async function combineStepResults(args: {
  compositionSteps: CompositionAgentOutput
  analysisStepResults: StepAgentOutput[]
  modelId?: string // TODO implement this later
  cachedRunIds?: Map<string, string> // Map of "stepIndex:assertionIndex" -> runId
  previousExplanation?: string | null // Previous explanation if everything was cached
}): Promise<EvaluationOutput> {
  const {
    compositionSteps,
    analysisStepResults,
    cachedRunIds,
    previousExplanation,
  } = args

  // Map composition steps with their corresponding analysis results
  const steps = compositionSteps.steps.map((decompStep, index) => {
    const analysisResult = analysisStepResults[index]

    // Use the original outcome from the composition step
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

  // If everything was cached, use the previous explanation instead of generating a new one
  let explanation: string
  if (previousExplanation) {
    explanation = previousExplanation
    console.info('Using cached explanation from previous run', {
      explanationLength: explanation.length,
    })
  } else {
    const stepSummary = steps
      .map((step, idx) => {
        const icon = step.conclusion === 'pass' ? '✅' : '❌'
        return `${icon} Step ${idx + 1} (${step.conclusion}): ${step.outcome}`
      })
      .join('\n')

    // Generate concise explanation using OpenAI
    const { text: generatedExplanation } = await generateText({
      model: agents.evaluation.options.model,
      prompt: dedent`
        You are summarizing the results of a story evaluation. Provide a very concise (2-3 sentences max) summary of the evaluation state.

Overall Status: ${status}

Step Results:
${stepSummary}

        Provide a brief, user-friendly explanation of what this evaluation found. Focus on the key outcomes and any issues.
      `,
      experimental_telemetry: {
        isEnabled: true,
        recordInputs: true,
        recordOutputs: true,
      },
    })
    explanation = generatedExplanation
  }

  return evaluationOutputSchema.parse({
    version: 3,
    status,
    explanation,
    steps,
  })
}

/**
 * AI Agent that evaluates a single step from a user story
 */
async function agent(args: {
  stepContext: StepContext
  evaluationAgentOptions: evaluationAgentOptions
}): Promise<StepAgentOutput> {
  const {
    stepContext,
    evaluationAgentOptions: { repo, options },
  } = args

  const agent = new Agent({
    model: agents.evaluation.options.model,
    system: buildEvaluationInstructions(stepContext.repoOutline),
    tools: {
      // TODO
      // terminalCommand: createTerminalCommandTool({ sandbox }),
      // readFile: createReadFileTool({ sandbox }),
      // resolveLibrary: createResolveLibraryTool(),
      // getLibraryDocs: createGetLibraryDocsTool(),
      // // TODO fix this getting: Error: "error starting LSP server"
      // // - **lsp**: Use the Language Server Protocol to list symbols in a file (\`documentSymbols\`) or discover symbols across the codebase (\`sandboxSymbols\`). Only supports TypeScript and Python sources.
      // // lsp: createLspTool({ sandbox }),
    },
    toolChoice: 'auto', // must be auto to the agent can choose when to finish.
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'story-step-evaluation-v3',
      metadata: {
        storyName: stepContext.storyName,
        repoId: repo.id,
        repoSlug: repo.slug,
        daytonaSandboxId: options?.daytonaSandboxId ?? '',
        stepIndex: stepContext.stepIndex,
      },
      tracer: options?.telemetryTracer,
    },
    onStepFinish: (step) => {
      if (step.reasoningText) {
        // await streams.append('progress', step.reasoningText)
        // TODO
      }
    },
    maxRetries: 3, // @default 2
    stopWhen: stepCountIs(
      options?.maxSteps ?? agents.evaluation.options.maxSteps,
    ),
    experimental_output: Output.object({ schema: stepAgentOutputSchema }),
  })

  const prompt = buildStepPrompt({ stepContext })

  const result = await agent.generate({ prompt })

  console.log(`🌸 Step ${stepContext.stepIndex + 1} Evaluation Result`, {
    stepContext,
    prompt,
    result,
  })

  // Handle case where agent hit max steps without generating output
  if (!result.experimental_output) {
    const maxStepsUsed = options?.maxSteps ?? agents.evaluation.options.maxSteps
    console.warn(
      `Step ${stepContext.stepIndex + 1} hit max steps (${maxStepsUsed}) without generating output`,
    )
    return {
      conclusion: 'fail' as const,
      outcome: `Evaluation stopped after reaching maximum steps (${maxStepsUsed}). The step may require more investigation or a higher step limit.`,
      assertions: [],
    }
  }

  return result.experimental_output
}

export async function main(
  payload: evaluationAgentOptions,
): Promise<EvaluationOutput> {
  const { story, options } = payload

  // Cache entry and validation result are passed from test-story.ts
  const cacheEntry = options?.cacheEntry ?? null
  const validationResult = options?.validationResult ?? null
  const cachedRunIds = new Map<string, string>() // Map of "stepIndex:assertionIndex" -> runId

  // // Get repository outline once for all steps
  // const repoOutline = await sandbox.process.executeCommand(
  //   'tree -L 3 -I "dist|build|.git|.next|*.lock|*.log"',
  //   `workspace/repo`,
  // )
  // if (repoOutline.exitCode !== 0) {
  //   throw new Error(`Failed to get repo outline: ${repoOutline.result}`)
  // }
  // const outline = repoOutline.result ?? ''
  const outline = ''

  // Process each step sequentially
  const stepResults: StepAgentOutput[] = []
  const steps = story.composition.steps
  let allStepsCached = true // Track if all steps were cached

  for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
    const step = steps[stepIndex]

    // Skip agent evaluation for 'given' steps - they are preconditions assumed to be true
    if (step.type === 'given') {
      const stepResult: StepAgentOutput = {
        conclusion: 'pass',
        outcome: step.given,
        assertions: [],
      }
      stepResults.push(stepResult)
      console.info(
        `Skipping agent evaluation for given step ${stepIndex + 1} of ${steps.length}`,
        {
          step: step.given,
        },
      )
      continue
    }

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
              // Parse cache entry using Zod
              const parseResult =
                assertionCacheEntrySchema.safeParse(assertionCacheData)

              if (!parseResult.success) {
                console.warn(
                  `Failed to parse cache entry for assertion ${assertionIndex}`,
                  { error: parseResult.error },
                )
                allAssertionsCached = false
                break
              }

              const assertionCacheEntry = parseResult.data

              // Reconstruct evidence from cached file paths and line ranges
              const evidence: string[] = []
              if (assertionCacheEntry.evidence) {
                for (const [filename, fileCacheEntry] of Object.entries(
                  assertionCacheEntry.evidence,
                )) {
                  const { lineRanges } = fileCacheEntry
                  if (lineRanges && lineRanges.length > 0) {
                    // Reconstruct evidence with line ranges
                    for (const lineRange of lineRanges) {
                      evidence.push(`${filename}:${lineRange}`)
                    }
                  }
                }
              }

              const assertion = {
                fact: stepAssertion || '',
                evidence,
                ...(assertionCacheEntry.reason
                  ? { reason: assertionCacheEntry.reason }
                  : {}),
              } as StepAgentOutput['assertions'][number]
              cachedAssertions.push(assertion)

              // Track which run this came from
              // runId is on the top-level cacheEntry (the outer variable), not on the assertion cache entry
              if (cacheEntry?.runId) {
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
            // Use the cached conclusion (pass or fail) instead of always 'pass'
            const cachedConclusion = stepCacheData.conclusion ?? 'pass'

            console.info(
              `Using cached results for step ${stepIndex + 1} of ${steps.length}`,
              {
                stepIndex,
                runId: cacheEntry.runId,
                conclusion: cachedConclusion,
              },
            )

            const stepResult: StepAgentOutput = {
              conclusion: cachedConclusion,
              outcome: step.goal,
              assertions: cachedAssertions,
            }
            stepResults.push(stepResult)
            continue // This step was cached, continue to next step
          }
        }
        // If we reach here, the step was not fully cached
        allStepsCached = false
      } else {
        // Step is not valid in cache
        allStepsCached = false
      }
    } else {
      // Cache is disabled or not available for this step
      allStepsCached = false
    }

    const stepContext: StepContext = {
      stepIndex,
      step,
      previousResults: [...stepResults],
      storyName: story.title,
      storyText: story.behavior,
      repoOutline: outline,
    }

    console.info(`Evaluating step ${stepIndex + 1} of ${steps.length}`, {
      stepContext,
    })

    const stepResult = await agent({
      stepContext,
      evaluationAgentOptions: payload,
    })

    stepResults.push(stepResult)

    // Early exit if a critical step fails
    // TODO: Determine if we should continue or stop on failure
    // if (stepResult.conclusion === 'error') {
    //   console.warn(`Step ${stepIndex + 1} encountered an error, continuing...`)
    // }
  }

  console.log(allStepsCached)
  // // If everything was cached, retrieve the previous explanation from the database
  // let previousExplanation: string | null = null
  // if (
  //   allStepsCached &&
  //   cacheEntry?.runId &&
  //   story.id &&
  //   agents.evaluation.options.cacheOptions?.enabled
  // ) {
  //   try {
  //     const { DATABASE_URL } = getConfig()
  //     const db = setupDb(DATABASE_URL)

  //     const previousResult = await db
  //       .selectFrom('storyTestResults')
  //       .select(['analysis'])
  //       .where('storyId', '=', story.id)
  //       .where('runId', '=', cacheEntry.runId)
  //       .orderBy('completedAt', 'desc')
  //       .limit(1)
  //       .executeTakeFirst()

  //     if (previousResult?.analysis) {
  //       const analysis = previousResult.analysis as EvaluationOutput | null
  //       if (analysis?.explanation) {
  //         previousExplanation = analysis.explanation
  //         console.info('Retrieved previous explanation from cached run', {
  //           runId: cacheEntry.runId,
  //           explanationLength: previousExplanation.length,
  //         })
  //       }
  //     }
  //   } catch (error) {
  //     console.warn(
  //       'Failed to retrieve previous explanation, will generate new one',
  //       {
  //         error,
  //       },
  //     )
  //   }
  // }

  // Combine all step results into final evaluation
  const finalResult = await combineStepResults({
    compositionSteps: story.composition,
    analysisStepResults: stepResults,
    modelId: options?.modelId,
    cachedRunIds,
    previousExplanation: null, // TODO: Implement this later
  })

  console.debug('🤖 Evaluation Agent Final Result', {
    stepCount: stepResults.length,
    finalResult,
  })

  return finalResult
}
