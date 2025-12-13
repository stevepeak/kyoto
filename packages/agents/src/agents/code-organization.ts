import {
  createGitHubChecksTool,
  createLocalReadFileTool,
  createLocalTerminalCommandTool,
} from '@app/shell'
import { Experimental_Agent as Agent, Output, stepCountIs } from 'ai'
import { dedent } from 'ts-dedent'
import { z } from 'zod'

import { formatScopeContent } from '../helpers/format-scope-content'
import { formatScopeDescription } from '@app/shell'
import { type AnalyzeAgentOptions } from '../types'

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

/**
 * Ask an AI agent to scan code changes for functions and components that
 * should be moved to other packages or extracted into helper functions
 * to reduce file sizes and improve code organization.
 */
export async function analyzeCodeOrganization({
  context,
  options,
}: AnalyzeAgentOptions): Promise<CodeOrganizationOutput> {
  const { maxSteps = 30, telemetryTracer, progress } = options ?? {}
  const github = context.github
  const agent = new Agent({
    model: context.model,
    system: dedent`
      You are a senior engineer who identifies code organization issues.
      Your goal is to find functions and components that are:
      1. Too large or contain too much functionality (should be split)
      2. In the wrong location (should be moved to other packages for re-use)
      3. Should be extracted to helper functions for better isolation and reusability
      4. Duplicated across files (should be moved to shared utilities)

      # Your Task
      1. Analyze the pre-loaded code changes to understand what files were modified
      2. Read the relevant TypeScript files (.ts, .tsx) to analyze their structure
      3. Identify code organization issues:
         - Files that are too large (>300 lines is a good threshold, but context matters)
         - Functions/components that could be moved to other packages (check @app/* packages)
         - Utility functions that should be in @app/utils
         - Business logic that should be in appropriate domain packages
         - Components that should be extracted to separate files
         - Helper functions that should be extracted from large functions
      4. Return structured JSON following the provided schema

      # Tools Available
      - **readFile**: Read files from the repository to analyze their content (for files outside the scope or for additional context)
      ${github ? '- **githubChecks**: Create GitHub check runs and add inline annotations on code lines when running in GitHub Actions' : ''}

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
      ${github ? '- **When running in GitHub Actions**: Use the githubChecks tool to create a check run named "Code Organization" and add annotations directly on the code lines where issues are found.' : ''}
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
      schema: codeOrganizationOutputSchema,
    }),
  })

  const scopeDescription = formatScopeDescription({ scope: context.scope })

  const scopeContentText = formatScopeContent(context.scopeContent)

  const prompt = dedent`
    Review the ${scopeDescription} and find code organization issues.

    Code changes:
    ${scopeContentText || 'No code changes found.'}

    Analyze the code changes above. If needed, use the readFile tool to read full files for context.
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
