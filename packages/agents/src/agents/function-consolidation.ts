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

// Import agents config to avoid circular dependency
// We only need the default model from discovery agent
const DEFAULT_MODEL = 'openai/gpt-5-mini'

export const functionConsolidationSuggestionSchema = z.object({
  label: z.string(),
  functions: z
    .array(
      z.object({
        name: z.string(),
        file: z.string(),
        note: z.string().optional(),
      }),
    )
    .min(2),
  reasoning: z.string(),
  benefit: z.string().optional(),
})

export const functionConsolidationOutputSchema = z.object({
  suggestions: z.array(functionConsolidationSuggestionSchema),
})
export type FunctionConsolidationOutput = z.infer<
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

function buildRetrievalGuidance(scope: VibeCheckScope): string {
  switch (scope.type) {
    case 'commit':
      return dedent`
        - Use \`git show --name-only ${scope.commit}\` to see the changed files
        - Use \`git show ${scope.commit}\` to see the full diff
        - Use \`git diff ${scope.commit}^..${scope.commit}\` to see what changed
        - Filter for TypeScript files (.ts, .tsx) only
      `
    case 'commits':
      return dedent`
        - Use \`git show --name-only <sha>\` for each commit to see changed files
        - Use \`git diff <sha1>^..<sha2>\` to see changes across commits
        - Filter for TypeScript files (.ts, .tsx) only
      `
    case 'staged':
      return dedent`
        - Use \`git diff --cached --name-only\` to list staged files
        - Use \`git diff --cached\` to see the staged changes
        - Filter for TypeScript files (.ts, .tsx) only
      `
    case 'unstaged':
      return dedent`
        - Use \`git diff --name-only\` to list modified files
        - Use \`git diff\` to see unstaged changes
        - Use \`git ls-files --others --exclude-standard\` to list untracked files
        - Filter for TypeScript files (.ts, .tsx) only
      `
    case 'paths':
      return dedent`
        - Read the specified files directly using the readFile tool
        - Filter for TypeScript files (.ts, .tsx) only
      `
  }
}

/**
 * Ask an AI agent to scan code changes for functions that are similar
 * enough to consolidate (extract helper, deduplicate, etc.).
 */
export async function analyzeFunctionConsolidation({
  scope,
  options: {
    maxSteps = 12,
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
      - Only include suggestions where at least two functions overlap
      - Provide short labels and reasoning for each consolidation idea
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

    Respond with JSON matching the schema.
  `

  const result = await agent.generate({
    prompt,
  })

  return result.experimental_output
}
