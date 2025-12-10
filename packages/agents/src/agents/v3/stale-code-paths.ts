import { type Tracer } from '@opentelemetry/api'
import {
  Experimental_Agent as Agent,
  type LanguageModel,
  Output,
  stepCountIs,
} from 'ai'
import { dedent } from 'ts-dedent'
import { z } from 'zod'

import { agents } from '../../index'

export const staleCodeFindingSchema = z.object({
  file: z.string(),
  lastTouchedDays: z.number().int().nonnegative().nullable(),
  severity: z.enum(['info', 'warn', 'error']),
  reasoning: z.string(),
  suggestion: z.string().optional(),
})

export const staleCodePathsOutputSchema = z.object({
  findings: z.array(staleCodeFindingSchema),
})

export type StaleCodePathsOutput = z.infer<typeof staleCodePathsOutputSchema>

interface AnalyzeStaleCodePathsOptions {
  repo: {
    id: string
    slug?: string
  }
  files: Array<{
    path: string
    lastTouchedDays: number | null
  }>
  options?: {
    maxSteps?: number
    model?: LanguageModel
    telemetryTracer?: Tracer
    progress?: (message: string) => void
  }
}

/**
 * Ask an AI agent to assess which files look stale based on last-touched age.
 */
export async function analyzeStaleCodePaths({
  repo,
  files,
  options: {
    maxSteps = 8,
    model: providedModel,
    telemetryTracer,
    progress,
  } = {},
}: AnalyzeStaleCodePathsOptions): Promise<StaleCodePathsOutput> {
  const model = providedModel ?? agents.discovery.options.model

  const agent = new Agent({
    model,
    system: dedent`
      You are a senior engineer assessing regression risk from stale code paths.
      Flag files that have not been changed recently and explain the potential risk.
      Keep output concise and follow the schema exactly.
    `,
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'stale-code-paths',
      metadata: {
        repoId: repo.id,
        repoSlug: repo.slug,
        fileCount: files.length,
      },
      tracer: telemetryTracer,
    },
    onStepFinish: (step) => {
      if (step.reasoningText && step.reasoningText !== '[REDACTED]') {
        progress?.(step.reasoningText)
      }
    },
    stopWhen: stepCountIs(maxSteps),
    experimental_output: Output.object({
      schema: staleCodePathsOutputSchema,
    }),
  })

  const fileTable = files
    .map((file, index) => {
      const age =
        file.lastTouchedDays === null
          ? 'unknown'
          : `${file.lastTouchedDays} days`
      return `${index + 1}. ${file.path} — last touched ${age}`
    })
    .join('\n')

  const prompt = dedent`
    Review these files and decide which are "stale" and worth flagging:
    ${fileTable}

    Guidance:
    - Stale if untouched for ~180+ days (warn) or 360+ days (error).
    - Mark as info if borderline or low-risk.
    - Provide a short reasoning and optional mitigation suggestion.

    Respond with JSON matching the schema.
  `

  const result = await agent.generate({ prompt })
  return result.experimental_output
}
