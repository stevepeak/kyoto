import { dedent } from 'ts-dedent'
import { z } from 'zod'

import {
  createAnalyzeAgent,
  githubChecksInstruction,
  toolsAvailableSection,
} from '../factory'

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

/**
 * Ask an AI agent to scan code changes for functions that are similar
 * enough to consolidate (extract helper, deduplicate, etc.).
 */
export const analyzeFunctionConsolidation = createAnalyzeAgent({
  functionId: 'function-consolidation',
  schema: functionConsolidationOutputSchema,
  defaultMaxSteps: 30,
  buildSystemPrompt: ({ hasGitHub }) => dedent`
    You are a senior engineer who spots duplicate or overlapping functions.
    Your goal is to suggest where two or more functions could be consolidated
    into a shared helper, merged implementation, or clearer abstraction.

    # Your Task
    1. Analyze the pre-loaded code changes to understand what files were modified
    2. Read the relevant TypeScript files (.ts, .tsx) to analyze their functions
    3. Identify functions that overlap in purpose, inputs, or control flow
    4. Return structured JSON following the provided schema

    ${toolsAvailableSection({ hasGitHub })}

    # Important Instructions
    - Only analyze TypeScript files (.ts, .tsx)
    - Prefer highlighting overlaps in purpose, inputs, and repeated control flow
    - Only include findings where at least two functions overlap
    - For each finding:
      - **message**: A concise description of the functions that could be consolidated (e.g., "validateUser ↔ validateAccount (auth.ts)")
      - **path**: The file path where the consolidation should happen (typically the first file)
      - **suggestion**: Detailed reasoning about why these functions should be consolidated and how
      - **severity**: Use "warn" for consolidation opportunities
    ${githubChecksInstruction({ hasGitHub, checkName: 'Function Consolidation' })}
    - Keep findings concise and actionable
  `,
  buildPrompt: ({ scopeDescription, scopeContent }) => dedent`
    Review the ${scopeDescription} and find functions that can be consolidated.

    Code changes:
    ${scopeContent}

    Analyze the code changes above. If needed, use the readFile tool to read full files for context.
    Look for functions that share similar logic, patterns, or could benefit from
    being extracted into shared helpers.

    For each consolidation opportunity, create a finding with:
    - A message describing which functions overlap (format: "function1 ↔ function2 (file.ts)")
    - The file path where consolidation should occur
    - A suggestion explaining the reasoning and how to consolidate
    - Severity set to "warn"

    Respond with JSON matching the schema.
  `,
})
