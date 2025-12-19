import {
  createGitHubChecksTool,
  createLocalReadFileTool,
  createLocalTerminalCommandTool,
  formatScopeDescription,
} from '@app/shell'
import { Experimental_Agent as Agent, Output, stepCountIs } from 'ai'
import { dedent } from 'ts-dedent'
import { type z } from 'zod'

import { formatScopeContent } from './helpers/format-scope-content'
import { type AnalyzeAgentOptions } from './types'

type CreateAnalyzeAgentConfig<TSchema extends z.ZodTypeAny> = {
  /** Unique identifier for telemetry and logging */
  functionId: string
  /** The output schema for the agent */
  schema: TSchema
  /** Default max steps (can be overridden via options) */
  defaultMaxSteps?: number
  /** System prompt builder - receives github flag to conditionally include github-specific instructions */
  buildSystemPrompt: (args: { hasGitHub: boolean }) => string
  /** User prompt builder - receives formatted scope description and content */
  buildPrompt: (args: {
    scopeDescription: string
    scopeContent: string
  }) => string
  /** Whether to include the terminalCommand tool (default: true) */
  includeTerminalTool?: boolean
}

/**
 * Factory function to create scope-based analyze agents with common boilerplate.
 * Each agent provides its schema, prompts, and customizations.
 */
export function createAnalyzeAgent<TSchema extends z.ZodTypeAny>(
  config: CreateAnalyzeAgentConfig<TSchema>,
): (options: AnalyzeAgentOptions) => Promise<z.infer<TSchema>> {
  const {
    functionId,
    schema,
    defaultMaxSteps = 30,
    buildSystemPrompt,
    buildPrompt,
    includeTerminalTool = true,
  } = config

  return async function analyzeAgent({
    context,
    options,
  }: AnalyzeAgentOptions): Promise<z.infer<TSchema>> {
    const {
      maxSteps = defaultMaxSteps,
      telemetryTracer,
      progress,
    } = options ?? {}
    const github = context.github

    const agent = new Agent({
      model: context.model,
      system: buildSystemPrompt({ hasGitHub: Boolean(github) }),
      experimental_telemetry: {
        isEnabled: true,
        functionId,
        tracer: telemetryTracer,
      },
      tools: {
        ...(includeTerminalTool
          ? { terminalCommand: createLocalTerminalCommandTool(progress) }
          : {}),
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
        schema,
      }),
    })

    const scopeDescription = formatScopeDescription({ scope: context.scope })
    const scopeContentText = formatScopeContent(context.scopeContent)

    const prompt = buildPrompt({
      scopeDescription,
      scopeContent: scopeContentText || 'No code changes found.',
    })

    const result = await agent.generate({
      prompt,
    })

    return result.experimental_output
  }
}

/** Helper to build github checks instruction for system prompts */
export function githubChecksInstruction(args: {
  hasGitHub: boolean
  checkName: string
}): string {
  if (!args.hasGitHub) return ''
  return dedent`
    - **When running in GitHub Actions**: Use the githubChecks tool to create a check run named "${args.checkName}" and add annotations directly on the code lines where issues are found.
  `
}

/** Helper to build tools available section for system prompts */
export function toolsAvailableSection(args: {
  hasGitHub?: boolean
  includeTerminal?: boolean
}): string {
  const lines = ['# Tools Available']
  if (args.includeTerminal !== false) {
    lines.push(
      '- **terminalCommand**: Execute terminal commands to explore the codebase',
    )
  }
  lines.push(
    '- **readFile**: Read files from the repository to analyze their content (for files outside the scope or for additional context)',
  )
  if (args.hasGitHub) {
    lines.push(
      '- **githubChecks**: Create GitHub check runs and add inline annotations on code lines when running in GitHub Actions',
    )
  }
  return lines.join('\n')
}
