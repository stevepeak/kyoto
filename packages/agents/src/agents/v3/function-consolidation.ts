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
  files: {
    path: string
    content: string
  }[]
  options?: {
    maxSteps?: number
    model?: LanguageModel
    telemetryTracer?: Tracer
    progress?: (message: string) => void
  }
}

/**
 * Ask an AI agent to scan provided code for functions that are similar
 * enough to consolidate (extract helper, deduplicate, etc.).
 */
export async function analyzeFunctionConsolidation({
  files,
  options: {
    maxSteps = 12,
    model: providedModel,
    telemetryTracer,
    progress,
  } = {},
}: AnalyzeFunctionConsolidationOptions): Promise<FunctionConsolidationOutput> {
  const model = providedModel ?? agents.discovery.options.model
  const agent = new Agent({
    model,
    system: dedent`
      You are a senior engineer who spots duplicate or overlapping functions.
      Your goal is to suggest where two or more functions could be consolidated
      into a shared helper, merged implementation, or clearer abstraction.

      Return structured JSON following the provided schema and keep findings concise.
    `,
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'function-consolidation',
      tracer: telemetryTracer,
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

  const fileSummaries = files
    .map(
      (file, index) =>
        dedent`
          File ${index + 1}: ${file.path}
          ---
          ${file.content.slice(0, 6000)}
        `,
    )
    .join('\n\n')

  const prompt = dedent`
    Review the following changed files and find functions that can be consolidated.

    - Prefer highlighting overlaps in purpose, inputs, and repeated control flow.
    - Only include suggestions where at least two functions overlap.
    - Provide short labels and reasoning for each consolidation idea.

    ${fileSummaries}

    Respond with JSON matching the schema.
  `

  const result = await agent.generate({
    prompt,
  })

  return result.experimental_output
}
