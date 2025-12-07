import { Experimental_Agent as Agent, Output, stepCountIs } from 'ai'
import type { Tracer } from '@opentelemetry/api'
import { dedent } from 'ts-dedent'

import type { LanguageModel } from 'ai'
import { type DiscoveredStory } from '@app/schemas'
import { agents } from '../../index.js'
import z from 'zod'

type StoryCheckAgentOptions = {
  story: DiscoveredStory
  searchStoriesTool: any
  options: {
    maxSteps?: number
    model?: LanguageModel
    telemetryTracer?: Tracer
    logger?: (message: string) => void
  }
}

/**
 * System instructions for story checking
 */
function buildSystemInstructions(): string {
  return dedent`
    You are an expert at identifying duplicate user stories using semantic similarity search.

    # Your Task

    Check if a user story with the same behavior already exists in the database by searching for similar stories.

    # How to Work

    1. Use the \`searchStories\` tool to search for stories with similar behavior
    2. Construct a search query from the story's title and behavior text
    3. Analyze the search results to determine if any existing story describes the same user behavior
    4. Return true if a matching story is found, false otherwise

    # What Constitutes a Match

    A story matches if it describes the **same user behavior**, even if:
    - The wording is slightly different
    - The acceptance criteria differ slightly
    - The code references are different

    Focus on the **core user behavior** - what the user does and what outcome they experience.

    # Examples

    - "User can sign in with GitHub" matches "User signs in using GitHub OAuth"
    - "User creates a new team" matches "User can create a team"
    - "User sees error message when login fails" matches "User receives error notification on failed login"

    These do NOT match:
    - "User can sign in with GitHub" vs "User can sign in with email" (different behavior)
    - "User creates a team" vs "User views team details" (different actions)

    Return a boolean: true if a matching story exists, false if not.
  `
}

/**
 * Prompt builder for story checking
 */
function buildPrompt(story: DiscoveredStory): string {
  return dedent`
    Check if a story with the same user behavior already exists.

    Story to check:
    Title: ${story.title}
    Behavior: ${story.behavior}
    ${story.acceptanceCriteria.length > 0 ? `Acceptance Criteria: ${story.acceptanceCriteria.join(', ')}` : ''}

    Use the searchStories tool to find similar stories. If you find a story that describes the same user behavior, return true. Otherwise, return false.
  `
}

type StoryCheckResult = {
  found: boolean
}

export async function runStoryCheckAgent(
  options: StoryCheckAgentOptions,
): Promise<StoryCheckResult> {
  const { story, searchStoriesTool } = options
  const {
    maxSteps = 10,
    model = agents.discovery.options.model,
    telemetryTracer,
    logger,
  } = options.options

  const tools: Record<string, any> = {
    searchStories: searchStoriesTool,
  }

  const agent = new Agent({
    model,
    system: buildSystemInstructions(),
    tools: tools as any,
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'story-check-v3',
      metadata: {
        storyTitle: story.title,
      },
      tracer: telemetryTracer,
    },
    onStepFinish: (step) => {
      if (step.reasoningText && !step.reasoningText.includes('[REDACTED]')) {
        logger?.(step.reasoningText)
      }
    },
    stopWhen: stepCountIs(maxSteps),
    experimental_output: Output.object({
      schema: z.boolean(),
    }),
  })

  const prompt = buildPrompt(story)

  const result = await agent.generate({ prompt })
  const found = result.experimental_output

  return { found }
}
