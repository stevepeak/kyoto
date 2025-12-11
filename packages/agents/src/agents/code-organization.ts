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

export const codeOrganizationOutputSchema = z.object({
  findings: z.array(
    z.object({
      message: z.string(),
      path: z.string().optional(),
      suggestion: z.string().optional(),
      severity: z.enum(['info', 'warn', 'error']),
    }),
  ),
})
type CodeOrganizationOutput = z.infer<typeof codeOrganizationOutputSchema>

interface AnalyzeCodeOrganizationOptions {
  scope: VibeCheckScope
  options?: {
    maxSteps?: number
    model?: LanguageModel
    telemetryTracer?: Tracer
    progress?: (message: string) => void
  }
}

/**
 * Ask an AI agent to scan code changes for functions and components that
 * should be moved to other packages or extracted into helper functions
 * to reduce file sizes and improve code organization.
 */
export async function analyzeCodeOrganization({
  scope,
  options: {
    maxSteps = 30,
    model: providedModel,
    telemetryTracer,
    progress,
  } = {},
}: AnalyzeCodeOrganizationOptions): Promise<CodeOrganizationOutput> {
  const model = providedModel ?? DEFAULT_MODEL
  const agent = new Agent({
    model,
    system: dedent`
      You are a senior engineer who identifies code organization issues.
      Your goal is to find functions and components that are:
      1. Too large or contain too much functionality (should be split)
      2. In the wrong location (should be moved to other packages for re-use)
      3. Should be extracted to helper functions for better isolation and reusability
      4. Duplicated across files (should be moved to shared utilities)

      # Your Task
      1. Retrieve the changed files using git commands (terminalCommand) or readFile tool
      2. Read the relevant TypeScript files (.ts, .tsx) to analyze their structure
      3. Identify code organization issues:
         - Files that are too large (>300 lines is a good threshold, but context matters)
         - Functions/components that could be moved to other packages (check @app/* packages)
         - Utility functions that should be in @app/utils
         - Business logic that should be in appropriate domain packages
         - Components that should be extracted to separate files
         - Helper functions that should be extracted from large functions
      4. Return structured JSON following the provided schema

      # Retrieving Changes
      ${buildRetrievalGuidance(scope)}

      # Tools Available
      - **terminalCommand**: Execute git commands to retrieve change information
      - **readFile**: Read files from the repository to analyze their content

      # Package Structure Context
      The monorepo has these packages:
      - @app/utils: General JavaScript utilities (type checking, noop, etc.)
      - @app/schemas: Shared Zod schemas
      - @app/db: Database access and migrations
      - @app/api: Server-side tRPC API definitions
      - @app/agents: AI agent tooling
      - @app/shell: Shell tools for file system and terminal operations
      - Other domain-specific packages as needed

      # Important Instructions
      - Only analyze TypeScript files (.ts, .tsx)
      - Look for files that are doing too much (violating single responsibility)
      - Identify functions that are generic enough to be in @app/utils
      - Identify domain-specific logic that should be in appropriate packages
      - Look for large components that should be split into smaller components
      - Look for helper functions that are embedded in larger functions but could be extracted
      - Consider reusability: if something is used in multiple places, it should be extracted
      - For each finding:
        - **message**: A concise description (e.g., "Large file (450 lines) - extract helpers", "Utility function should be in @app/utils", "Component should be split into smaller pieces")
        - **path**: The file path where the issue exists
        - **suggestion**: Detailed reasoning about what should be moved/extracted and where it should go
        - **severity**: Use "warn" for organization issues, "error" for critical size/complexity issues
      - Keep findings concise and actionable
      - Focus on the most impactful refactoring opportunities
    `,
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'code-organization',
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
      schema: codeOrganizationOutputSchema,
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
    Review the ${scopeDescription} and find code organization issues.

    Use the available tools to retrieve and analyze the changed TypeScript files.
    Look for:
    - Files that are too large or contain too much functionality
    - Functions/components that should be moved to other packages
    - Helper functions that should be extracted for reusability
    - Code that is in the wrong location (should be in @app/utils, domain packages, etc.)

    For each organization issue, create a finding with:
    - A message describing the issue (e.g., "Large file - extract helpers", "Utility should be in @app/utils")
    - The file path where the issue exists
    - A suggestion explaining what should be moved/extracted and where it should go
    - Severity: "warn" for organization issues, "error" for critical size/complexity issues

    Respond with JSON matching the schema.
  `

  const result = await agent.generate({
    prompt,
  })

  return result.experimental_output
}
