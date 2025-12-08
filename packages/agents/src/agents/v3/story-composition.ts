import {
  type CompositionAgentOutput,
  compositionAgentOutputSchema,
  type DiscoveredStory,
} from '@app/schemas'
import { type Tracer } from '@opentelemetry/api'
import { Experimental_Agent as Agent, Output, stepCountIs } from 'ai'
import { dedent } from 'ts-dedent'
import { zodToJsonSchema } from 'zod-to-json-schema'

import { agents } from '../../index'

type CompositionAgentOptions = {
  story: DiscoveredStory
  repo: {
    id: string
    slug: string
  }
  options?: {
    telemetryTracer?: Tracer
    maxSteps?: number
    logger?: (message: string) => void
  }
}

function makeSystemInstructions(): string {
  return dedent`
    You are an expert software QA analyst tasked with interpreting a plain-language user story into a **context-aware, stateful sequence of verifiable behavioral steps**.

    # 🎯 Objective
    Translate the provided story into a structured list of **testable assertions** that describe what must be true for the story to be valid.

    Each step:
    - Represents a factual state transition in the user experience or system behavior.
    - May rely on previously established context or variables.
    - Updates the shared environment for subsequent steps.

    # Evaluation Mindset
    Think like a QA engineer reasoning through both behavior and domain state.
    Stay within the bounds of the user story itself.
    DO NOT add additional requirements or assertions unless they are explicitly stated in the original user story.

    # Language Rules
    - Do not use temporal adverbs like "immediately", "instantly", "right away", etc. if necessary use the word "then" or "after" instead.

    # Resources Available
    You have read-only tools to:
    - Explore repository structure and contents.
    - Inspect function/class/type names and symbol usage.

    > Use these tools to resolve ambiguous statements in the story wherein researching source code would assist with understanding intent.

    # Output Guidelines
    - Use concise, domain-agnostic phrasing.
    - Each step should be independently verifiable and logically dependent on its preconditions.
    - Assertions should be declarative statements that can be verified.
    - Avoid redundancy: once a fact is established, reference it rather than restate it.
    - Maintain causal flow — every step transitions from one valid state to the next.
    - **Never** include source code nor pseudocode.

    **Good Example Assertions:**
    - A user is signed in with an active session.
    - The user can create a new discussion thread.
    - The new thread is labeled as an AI thread.
    - New messages appear in the thread, to the user immediately.
    - The thread owner references the signed-in user.

    **Bad Example Assertions (don't do this):**
    - Using jargon or syntax like \`U\` for authenticated user
    - Using syntax like \`T.state = active && M.thread = T\`
    - Using property names like \`Thread.owner\`

    # Output Schema
    \`\`\`json
    ${JSON.stringify(zodToJsonSchema(compositionAgentOutputSchema), null, 2)}
    \`\`\`

    # Goal
    Produce a causal, stateful sequence of steps that reflects both **user experience** and **system truth**, where each step's assertions enrich a shared, object-oriented context.  
    This output can be executed by a reasoning agent to simulate the logical progression of the story from start to finish.
  `
}

function makePrompt(story: DiscoveredStory): string {
  return dedent`
    User Story:
    ${story}

    Compose this story and break it down into a sequential list of steps. Each step should be either:
    - A "given" precondition that must be true before evaluating requirements
    - A "requirement" with an outcome and assertions describing what becomes true

    When your composition is complete, respond only with the JSON object that matches the schema.
  `
}

export async function runCompositionAgent({
  story,
  repo,
  options,
}: CompositionAgentOptions): Promise<CompositionAgentOutput> {
  const { logger } = options ?? {}

  const agent = new Agent({
    model: agents.composition.options.model,
    system: makeSystemInstructions(),
    tools: {
      // TODO
    },
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'story-composition-v3',
      metadata: {
        repoId: repo.id,
        repoSlug: repo.slug,
        modelId: agents.composition.options?.model,
      },
      tracer: options?.telemetryTracer,
    },
    stopWhen: stepCountIs(
      options?.maxSteps ?? agents.composition.options.maxSteps,
    ),
    onStepFinish: (step) => {
      if (step.reasoningText && !step.reasoningText.includes('[REDACTED]')) {
        logger?.(step.reasoningText)
      }
    },
    experimental_output: Output.object({
      schema: compositionAgentOutputSchema,
    }),
  })

  const result = await agent.generate({ prompt: makePrompt(story) })

  return result.experimental_output
}
