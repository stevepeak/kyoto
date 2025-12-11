import {
  createLocalReadFileTool,
  createLocalTerminalCommandTool,
} from '@app/shell'
import { type AgentRunState } from '@app/types'
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

export const planSummarizationOutputSchema = z.object({
  markdown: z
    .string()
    .describe('The summarized and prioritized plan in markdown format'),
})
type PlanSummarizationOutput = z.infer<typeof planSummarizationOutputSchema>

interface AnalyzePlanSummarizationOptions {
  agentStates: AgentRunState[]
  gitRoot: string // Used implicitly by terminal commands (process.cwd())
  options?: {
    maxSteps?: number
    model?: LanguageModel
    telemetryTracer?: Tracer
    progress?: (message: string) => void
  }
}

/**
 * Summarize and prioritize all vibe check findings into a concise markdown plan.
 * The agent analyzes all findings, reads relevant files for context, and creates
 * a prioritized action plan.
 */
export async function analyzePlanSummarization({
  agentStates,
  gitRoot: _gitRoot, // Terminal commands use process.cwd() which should be git root
  options: {
    maxSteps = 30,
    model: providedModel,
    telemetryTracer,
    progress,
  } = {},
}: AnalyzePlanSummarizationOptions): Promise<PlanSummarizationOutput> {
  const model = providedModel ?? DEFAULT_MODEL

  // Collect all findings with their agent context
  const allFindings: Array<{
    agentLabel: string
    agentId: string
    message: string
    path?: string
    suggestion?: string
    severity: 'info' | 'warn' | 'error'
  }> = []

  for (const state of agentStates) {
    const findings = state.result?.findings ?? []
    for (const finding of findings) {
      allFindings.push({
        agentLabel: state.label,
        agentId: state.id,
        ...finding,
      })
    }
  }

  // Build context about all findings
  const findingsSummary = allFindings
    .map((f, idx) => {
      const parts = [
        `${idx + 1}. [${f.severity.toUpperCase()}] ${f.message}`,
        `   Agent: ${f.agentLabel}`,
      ]
      if (f.path) {
        parts.push(`   Path: ${f.path}`)
      }
      if (f.suggestion) {
        parts.push(`   Suggestion: ${f.suggestion}`)
      }
      return parts.join('\n')
    })
    .join('\n\n')

  const errorCount = allFindings.filter((f) => f.severity === 'error').length
  const warnCount = allFindings.filter((f) => f.severity === 'warn').length
  const infoCount = allFindings.filter((f) => f.severity === 'info').length

  const agent = new Agent({
    model,
    system: dedent`
      You are a senior engineering lead who synthesizes code review findings into actionable, prioritized plans.
      Your goal is to take findings from multiple code analysis agents and create a concise, well-organized
      markdown document that helps developers understand what needs to be addressed and in what order.

      # Your Task
      1. Review all the findings from the various code analysis agents
      2. Use terminal and readFile tools to examine relevant code files for context when needed
      3. Summarize findings by grouping related issues together
      4. Stack rank findings by priority (critical errors first, then warnings, then info)
      5. Create a concise markdown document that serves as an action plan

      # Tools Available
      - **terminalCommand**: Execute git commands or other terminal commands to explore the codebase
      - **readFile**: Read files from the repository to understand context around findings

      # Output Format
      Create a markdown document with the following structure:
      
      ## Executive Summary
      - Brief overview of the findings (total counts by severity)
      - High-level assessment of code quality
      
      ## Priority Actions (Stack Ranked)
      Group and prioritize findings by:
      1. **Critical Issues (ERROR)**: Must fix before proceeding
      2. **Important Issues (WARN)**: Should address soon
      3. **Improvements (INFO)**: Nice to have, can be addressed later
      
      Within each priority level, further prioritize by:
      - Impact (how many files/users affected)
      - Dependencies (fix foundational issues first)
      - Risk (security, stability, correctness)
      
      For each prioritized item:
      - Clear, actionable description
      - Affected files/paths
      - Brief rationale for priority
      - Related findings grouped together when they address the same concern
      
      ## Summary by Agent
      - Brief summary of what each agent found (optional, can be concise)
      
      # Important Instructions
      - Be concise but comprehensive
      - Group related findings together (e.g., all findings about the same file or pattern)
      - Prioritize based on severity, impact, and dependencies
      - Use clear markdown formatting with headers, lists, and emphasis
      - Focus on actionable items developers can address
      - If you need more context about a finding, use the tools to read relevant files
      - Keep the document focused and scannable
      - Don't duplicate information unnecessarily
    `,
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'plan-summarization',
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
      schema: planSummarizationOutputSchema,
    }),
  })

  const prompt = dedent`
    Summarize and prioritize the following findings from code analysis agents.

    ## Findings Overview
    - Total findings: ${allFindings.length}
    - Errors: ${errorCount}
    - Warnings: ${warnCount}
    - Info: ${infoCount}

    ## All Findings
    ${findingsSummary}

    Review these findings and create a concise, prioritized markdown plan. Use the available tools
    to read relevant files if you need more context to understand the impact or relationships between findings.

    Group related findings together and stack rank them by priority. Focus on creating an actionable
    plan that developers can follow to address the most critical issues first.

    Output the complete markdown document in the markdown field.
  `

  const result = await agent.generate({
    prompt,
  })

  return result.experimental_output
}
