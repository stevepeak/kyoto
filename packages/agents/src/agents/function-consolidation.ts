import {
  createGitHubChecksTool,
  createLocalReadFileTool,
  createLocalTerminalCommandTool,
} from '@app/shell'
import { Experimental_Agent as Agent, Output, stepCountIs } from 'ai'
import { dedent } from 'ts-dedent'
import { z } from 'zod'

import { formatScopeContent } from '../helpers/format-scope-content'
import { formatScopeDescription } from '../helpers/format-scope-description'
import { type AnalyzeAgentOptions } from '../types'

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

/**
 * Ask an AI agent to scan code changes for functions that are similar
 * enough to consolidate (extract helper, deduplicate, etc.).
 */
export async function analyzeFunctionConsolidation({
  context,
  options,
}: AnalyzeAgentOptions): Promise<FunctionConsolidationOutput> {
  const { maxSteps = 30, telemetryTracer, progress } = options ?? {}
  const github = context.github
  const agent = new Agent({
    model: context.model,
    system: dedent`
      You are a senior engineer who spots duplicate or overlapping functions.
      Your goal is to suggest where two or more functions could be consolidated
      into a shared helper, merged implementation, or clearer abstraction.

      # Your Task
      1. Analyze the pre-loaded code changes to understand what files were modified
      2. Read the relevant TypeScript files (.ts, .tsx) to analyze their functions
      3. Identify functions that overlap in purpose, inputs, or control flow
      4. Return structured JSON following the provided schema

      # Tools Available
      - **readFile**: Read files from the repository to analyze their content (for files outside the scope or for additional context)
      ${github ? '- **githubChecks**: Create GitHub check runs and add inline annotations on code lines when running in GitHub Actions' : ''}

      # Important Instructions
      - Only analyze TypeScript files (.ts, .tsx)
      - Prefer highlighting overlaps in purpose, inputs, and repeated control flow
      - Only include findings where at least two functions overlap
      - For each finding:
        - **message**: A concise description of the functions that could be consolidated (e.g., "validateUser ↔ validateAccount (auth.ts)")
        - **path**: The file path where the consolidation should happen (typically the first file)
        - **suggestion**: Detailed reasoning about why these functions should be consolidated and how
        - **severity**: Use "warn" for consolidation opportunities
      ${github ? '- **When running in GitHub Actions**: Use the githubChecks tool to create a check run named "Function Consolidation" and add annotations directly on the code lines where consolidation opportunities exist.' : ''}
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
      ...(github
        ? { githubChecks: createGitHubChecksTool(github, progress) }
        : {}),
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

  const scopeDescription = formatScopeDescription({ scope: context.scope })

  const scopeContentText = formatScopeContent(context.scopeContent)

  const prompt = dedent`
    Review the ${scopeDescription} and find functions that can be consolidated.

    Code changes:
    ${scopeContentText || 'No code changes found.'}

    Analyze the code changes above. If needed, use the readFile tool to read full files for context.
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
