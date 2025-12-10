import {
  createLocalReadFileTool,
  createLocalTerminalCommandTool,
} from '@app/shell'
import { type VibeCheckScope } from '@app/types'
import { type Tracer } from '@opentelemetry/api'
import {
  Experimental_Agent as Agent,
  type LanguageModel,
  Output,
  stepCountIs,
} from 'ai'
import { dedent } from 'ts-dedent'
import { z } from 'zod'

import { buildRetrievalGuidance } from '../helpers/build-retrieval-guidance'

// Import agents config to avoid circular dependency
// We only need the default model from discovery agent
const DEFAULT_MODEL = 'openai/gpt-5-mini'

export const functionConsolidationOutputSchema = z.object({
  findings: z.array(
    z.object({
      message: z.string(),
      path: z.string().optional(),
      suggestion: z.string().optional(),
      severity: z.enum(['info', 'warn', 'error']),
    }),
  ),
})
type FunctionConsolidationOutput = z.infer<
  typeof functionConsolidationOutputSchema
>

interface AnalyzeFunctionConsolidationOptions {
  scope: VibeCheckScope
  options?: {
    maxSteps?: number
    model?: LanguageModel
    telemetryTracer?: Tracer
    progress?: (message: string) => void
  }
}

/**
 * Ask an AI agent to scan code changes for functions that are similar
 * enough to consolidate (extract helper, deduplicate, etc.).
 */
export async function analyzeFunctionConsolidation({
  scope,
  options: {
    maxSteps = 30,
    model: providedModel,
    telemetryTracer,
    progress,
  } = {},
}: AnalyzeFunctionConsolidationOptions): Promise<FunctionConsolidationOutput> {
  const model = providedModel ?? DEFAULT_MODEL
  const agent = new Agent({
    model,
    system: dedent`
      You are a senior engineer who spots duplicate or overlapping functions.
      Your goal is to suggest where two or more functions could be consolidated
      into a shared helper, merged implementation, or clearer abstraction.

      # Your Task
      1. Retrieve the changed files using git commands (terminalCommand) or readFile tool
      2. Read the relevant TypeScript files (.ts, .tsx) to analyze their functions
      3. Identify functions that overlap in purpose, inputs, or control flow
      4. Return structured JSON following the provided schema

      # Retrieving Changes
      ${buildRetrievalGuidance(scope)}

      # Tools Available
      - **terminalCommand**: Execute git commands to retrieve change information
      - **readFile**: Read files from the repository to analyze their content

      # Important Instructions
      - Only analyze TypeScript files (.ts, .tsx)
      - Prefer highlighting overlaps in purpose, inputs, and repeated control flow
      - Only include findings where at least two functions overlap
      - For each finding:
        - **message**: A concise description of the functions that could be consolidated (e.g., "validateUser ↔ validateAccount (auth.ts)")
        - **path**: The file path where the consolidation should happen (typically the first file)
        - **suggestion**: Detailed reasoning about why these functions should be consolidated and how
        - **severity**: Use "warn" for consolidation opportunities
      - Keep findings concise and actionable
    `,
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'function-consolidation',
      tracer: telemetryTracer,
    },
    tools: {
      terminalCommand: createLocalTerminalCommandTool(progress),
      readFile: createLocalReadFileTool(progress),
    },
    stopWhen: stepCountIs(maxSteps),
    onStepFinish: (step) => {
      if (step.reasoningText && step.reasoningText !== '[REDACTED]') {
        progress?.(step.reasoningText)
      }
    },
    experimental_output: Output.object({
      schema: functionConsolidationOutputSchema,
    }),
  })

  const scopeDescription =
    scope.type === 'commit'
      ? `commit ${scope.commit}`
      : scope.type === 'commits'
        ? `commits ${scope.commits.join(', ')}`
        : scope.type === 'staged'
          ? 'staged changes'
          : scope.type === 'unstaged'
            ? 'unstaged changes'
            : `specified paths: ${scope.paths.join(', ')}`

  const prompt = dedent`
    Review the ${scopeDescription} and find functions that can be consolidated.

    Use the available tools to retrieve and analyze the changed TypeScript files.
    Look for functions that share similar logic, patterns, or could benefit from
    being extracted into shared helpers.

    For each consolidation opportunity, create a finding with:
    - A message describing which functions overlap (format: "function1 ↔ function2 (file.ts)")
    - The file path where consolidation should occur
    - A suggestion explaining the reasoning and how to consolidate
    - Severity set to "warn"

    Respond with JSON matching the schema.
  `

  const result = await agent.generate({
    prompt,
  })

  return result.experimental_output
}
