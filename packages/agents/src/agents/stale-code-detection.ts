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

export const staleCodeDetectionOutputSchema = z.object({
  findings: z.array(
    z.object({
      message: z.string(),
      path: z.string().optional(),
      suggestion: z.string().optional(),
      severity: z.enum(['info', 'warn', 'error']),
    }),
  ),
})
type StaleCodeDetectionOutput = z.infer<typeof staleCodeDetectionOutputSchema>

/**
 * Ask an AI agent to scan code changes for stale code:
 * - Code that was added in the scope but is not actually used
 * - Code that was previously used but is no longer reachable due to changes
 */
export async function analyzeStaleCodeDetection({
  context,
  options,
}: AnalyzeAgentOptions): Promise<StaleCodeDetectionOutput> {
  const { maxSteps = 25, telemetryTracer, progress } = options ?? {}
  const github = context.github
  const agent = new Agent({
    model: context.model,
    system: dedent`
      You are a senior engineer who identifies stale, unused, or unreachable code.
      Your goal is to find code that is not being used, either because it was added
      but never referenced, or because it became unreachable due to recent changes.

      # Your Task
      1. Analyze the pre-loaded code changes to understand what was modified
      2. Read the relevant TypeScript files (.ts, .tsx) to analyze their content
      3. Identify stale code in two categories:
         a. **New unused code**: Functions, variables, types, exports, or imports that were
            added in the scope but are never imported, called, or referenced anywhere
         b. **Dead code**: Code that was previously reachable but is now unreachable due to
            changes (e.g., unreachable after return statements, unused imports after refactoring,
            functions that are no longer called anywhere in the codebase)
      4. Return structured JSON following the provided schema

      # Tools Available
      - **terminalCommand**: Execute grep/ripgrep commands to search for usages across the codebase
      - **readFile**: Read files from the repository to analyze their content (for files outside the scope or for additional context)
      ${github ? '- **githubChecks**: Create GitHub check runs and add inline annotations on code lines when running in GitHub Actions' : ''}

      # Analysis Strategy
      For each changed file:
      1. **Identify new additions**: Look at what was added in the diff
      2. **Check for usage**: 
         - For exports: Search the codebase for imports of that export
         - For functions: Search for function calls or references
         - For types/interfaces: Search for type references
         - For variables/constants: Search for references
      3. **Check for dead code**:
         - Unreachable code after return/throw statements
         - Unused imports that were previously used but are no longer needed
         - Functions that are no longer called anywhere
         - Conditional branches that are always false/true
      4. **Verify across the codebase**: Use terminalCommand with grep/find to search for usages

      # Important Instructions
      - Only analyze TypeScript files (.ts, .tsx)
      - Be thorough: check both the changed files and search the entire codebase for usages
      - For new unused code: Only flag items that were ADDED in the scope and are not used
      - For dead code: Only flag items that became unreachable due to CHANGES in the scope
      - Use terminalCommand with grep/ripgrep to search for usages across the codebase:
        - \`grep -r "functionName" --include="*.ts" --include="*.tsx"\`
        - \`grep -r "exportName" --include="*.ts" --include="*.tsx"\`
      - For each finding:
        - **message**: A concise description of the stale code (e.g., "Unused export: validateUser", "Unreachable code after return statement")
        - **path**: The file path where the stale code exists
        - **suggestion**: Detailed explanation of why it's stale and how to fix it (remove it, or explain if it's intentionally unused)
        - **severity**: Use "warn" for unused code, "info" for potentially intentional unused exports
      ${github ? '- **When running in GitHub Actions**: Use the githubChecks tool to create a check run named "Stale Code Detection" and add annotations directly on the code lines where stale code is found.' : ''}
      - Don't flag:
        - Test files or test utilities (unless clearly unused)
        - Type-only exports that are used for type checking
        - Intentionally exported APIs that may be used externally
        - Code in comments or documentation
      - Keep findings concise and actionable
    `,
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'stale-code-detection',
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
      schema: staleCodeDetectionOutputSchema,
    }),
  })

  const scopeDescription = formatScopeDescription({ scope: context.scope })

  const scopeContentText = formatScopeContent(context.scopeContent)

  const prompt = dedent`
    Review the ${scopeDescription} and find stale code that is not being used.

    Code changes:
    ${scopeContentText || 'No code changes found.'}

    Use the available tools to:
    1. Analyze the code changes above to identify what was added or modified
    2. Identify new code that was added but is never used
    3. Identify existing code that became unreachable or unused due to changes
    4. Search the codebase using terminalCommand with grep/ripgrep to verify whether code is actually unused

    For each stale code finding, create a finding with:
    - A message describing what is stale (e.g., "Unused function: calculateTotal", "Unreachable code after return")
    - The file path where the stale code exists
    - A suggestion explaining why it's stale and how to fix it
    - Severity: "warn" for unused code, "info" for potentially intentional cases

    Be thorough: use grep/ripgrep to search the entire codebase for usages before flagging code as stale.

    Respond with JSON matching the schema.
  `

  const result = await agent.generate({
    prompt,
  })

  return result.experimental_output
}
