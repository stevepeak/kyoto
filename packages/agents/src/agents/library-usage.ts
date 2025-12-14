import {
  createGetLibraryDocsTool,
  createResolveLibraryTool,
} from '@app/context7'
import {
  createGitHubChecksTool,
  createLocalReadFileTool,
  createLocalTerminalCommandTool,
  formatScopeDescription,
} from '@app/shell'
import { type VibeCheckContext } from '@app/types'
import { type Tracer } from '@opentelemetry/api'
import { Experimental_Agent as Agent, Output, stepCountIs } from 'ai'
import { dedent } from 'ts-dedent'
import { z } from 'zod'

import { formatScopeContent } from '../helpers/format-scope-content'

export const libraryUsageOutputSchema = z.object({
  findings: z.array(
    z.object({
      message: z.string(),
      path: z.string().optional(),
      suggestion: z.string().optional(),
      severity: z.enum(['info', 'warn', 'error']),
    }),
  ),
})

type AnalyzeLibraryUsageOptions = {
  context: VibeCheckContext
  options?: {
    maxSteps?: number
    telemetryTracer?: Tracer
    progress?: (message: string) => void
  }
}

/**
 * AI agent that checks library usage against documentation to ensure
 * best practices are followed and custom code isn't duplicating library features.
 */
export async function analyzeLibraryUsage({
  context,
  options,
}: AnalyzeLibraryUsageOptions): Promise<
  z.infer<typeof libraryUsageOutputSchema>
> {
  const { maxSteps = 40, telemetryTracer, progress } = options ?? {}
  const github = context.github

  const systemPrompt = dedent`
    You are an expert code reviewer who ensures libraries are used correctly and efficiently.
    Your goal is to find places where:
    1. Custom code duplicates functionality the library already provides
    2. Library APIs are used incorrectly or against best practices
    3. Deprecated or discouraged patterns are used instead of recommended alternatives

    # Your Task
    1. Analyze the code changes to identify which libraries are imported/used
    2. For each significant library, use resolveLibrary to get its Context7 library ID
    3. Use getLibraryDocs to fetch documentation for relevant topics
    4. Compare the code against library best practices
    5. Return structured JSON with findings

    # Tools Available
    - **terminalCommand**: Execute terminal commands to explore the codebase
    - **readFile**: Read files from the repository for additional context
    - **resolveLibrary**: Resolve a library name to a Context7 library ID
    - **getLibraryDocs**: Fetch library documentation for a specific topic
    ${github ? '- **githubChecks**: Create GitHub check runs and add inline annotations' : ''}

    # Important Instructions
    - Focus on TypeScript/JavaScript files (.ts, .tsx, .js, .jsx)
    - Prioritize major libraries (React, Next.js, Zod, Drizzle, etc.) over minor utilities
    - Only report findings where you have concrete evidence from documentation
    - Be specific about what the library provides vs what the code is doing manually
    - For each finding:
      - **message**: Concise description of the issue (e.g., "Manual array filtering could use lodash.filter")
      - **path**: File path where the issue was found
      - **suggestion**: Specific recommendation with the library API to use instead
      - **severity**: Use "info" for optimization opportunities, "warn" for best practice violations
    ${github ? '- Use the githubChecks tool to create a check run named "Library Usage" and add annotations' : ''}
    - If no library misuse is found, return an empty findings array
  `

  const agent = new Agent({
    model: context.model,
    system: systemPrompt,
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'library-usage',
      tracer: telemetryTracer,
    },
    tools: {
      terminalCommand: createLocalTerminalCommandTool(progress),
      readFile: createLocalReadFileTool(progress),
      resolveLibrary: createResolveLibraryTool(),
      getLibraryDocs: createGetLibraryDocsTool(),
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
      schema: libraryUsageOutputSchema,
    }),
  })

  const scopeDescription = formatScopeDescription({ scope: context.scope })
  const scopeContentText = formatScopeContent(context.scopeContent)

  const prompt = dedent`
    Review the ${scopeDescription} and check library usage for best practices.

    Code changes:
    ${scopeContentText || 'No code changes found.'}

    Analyze the code changes above. For each library you see being used:
    1. Use resolveLibrary to get the library's Context7 ID
    2. Use getLibraryDocs to fetch relevant documentation (focus on topics related to how the library is being used)
    3. Compare the code against the documentation

    Look for:
    - Custom implementations of functionality the library already provides
    - Deprecated patterns or APIs
    - Incorrect usage that goes against library recommendations
    - Missing features that would simplify the code

    If you find issues, create findings with specific suggestions referencing the library documentation.
    If the library usage looks correct, return an empty findings array.

    Respond with JSON matching the schema.
  `

  const result = await agent.generate({ prompt })

  return result.experimental_output
}
