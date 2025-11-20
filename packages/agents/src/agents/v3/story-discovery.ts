import { Experimental_Agent as Agent, Output, stepCountIs } from 'ai'
import type { Tracer } from '@opentelemetry/api'
import { z } from 'zod'
import zodToJsonSchema from 'zod-to-json-schema'

import { getDaytonaSandbox } from '../../helpers/daytona'
import { createTerminalCommandTool } from '../../tools/terminal-command-tool'
import { createReadFileTool } from '../../tools/read-file-tool'
import { createResolveLibraryTool } from '../../tools/context7-tool'
import { createStorySearchTool } from '../../tools/story-search-tool'
import { logger, streams } from '@trigger.dev/sdk'
import type { LanguageModel } from 'ai'
import { rawStoryInputSchema } from '@app/schemas'
import { agents } from '../..'
import dedent from 'dedent'

/**
 * Schema for the story discovery output
 * Returns an array of discovered stories
 */
export const storyDiscoveryOutputSchema = z.object({
  stories: z.array(rawStoryInputSchema),
})

export type StoryDiscoveryOutput = z.infer<typeof storyDiscoveryOutputSchema>

type StoryDiscoveryContext = {
  mode?: 'repo_scan' | 'commit_diff'
  commitRange?: {
    before: string
    after: string
  }
  commitMessages?: string[]
  diffSummary?: string
  clues?: string[]
}

type StoryDiscoveryAgentOptions = {
  repo: {
    id: string
    slug: string
  }
  options: {
    daytonaSandboxId: string
    storyCount: number
    telemetryTracer?: Tracer
    maxSteps?: number
    model?: LanguageModel
    existingStoryTitles?: string[]
    context?: StoryDiscoveryContext
  }
}

function buildDiscoveryInstructions(): string {
  return dedent`
  
    You are an expert software analyst tasked with discovering user stories from a codebase.

    # 🎯 Objective
    Analyze the codebase to identify user-facing features and workflows. Focus on one specific functionality per story.

    # Story Format
    Each story must follow the classic agile format:

    **Given** [some initial context or state], (optional)
    **When** [an action is taken],
    **Then** [an expected outcome occurs].
    **And** [another action is taken], (optional)

    # Examples

    Example 1 - Password Reset:
    \`\`\`
    **Given** I am a registered user who has forgotten my password  
    **When** I request a password reset  
    **Then** I receive an email with a unique, one-time-use link that expires after 15 minutes
    \`\`\`

    Example 2 - User Login:
    \`\`\`
    **Given** I am a user with an existing account  
    **When** I enter my email and password on the login page  
    **Then** I click the "login" button
    **And** upon successful, login I am redirected to the dashboard
    \`\`\`


      # Discovery Focus
      Look for:
      - Authentication & Authorization flows (login, logout, sign up, password reset)
      - Navigation and routing features
      - CRUD operations (create, read, update, delete)
      - Feature workflows with multiple steps
      - UI interactions (dialogs, modals, forms, buttons)

      # Output Guidelines
      - Write stories in clear, natural language
      - Focus on one specific functionality per story
      - Focus on user-facing features, not implementation details
      - Each story should represent a complete, testable feature
      - Include 0 - 2 additional acceptance criteria to clarify anything that is ambiguous or requiring refinement
      - Keep stories focused on high-level behavior, not low-level code details

      # Resources Available
      You have read-only tools to:
      - Explore repository structure and contents
      - Inspect function/class/type names and symbol usage
      - Read file contents to understand features
      - Search existing user stories for this repository using the searchStories tool to avoid duplicates or surface updates

      # Rules
      - Never include source code or symbol references in the stories.
      - Keep it simple, keep it short. But have the story have enough detail to be useful as a test.
      - Do not use temporal adverbs like "immediately", "instantly", "right away", etc. if necessary use the word "then" or "after" instead.
      - Aim for no ambiguous statements. Do not use "should" in the stories. Use "then" instead.

    Use these tools to understand the codebase structure and identify user-facing features.

    # Output Schema
    \`\`\`json
    ${JSON.stringify(zodToJsonSchema(storyDiscoveryOutputSchema), null, 2)}
    \`\`\`

    # Goal
    Discover and document user stories that represent the main features and workflows in this codebase.
    Focus on high-level user interactions, not implementation details.
`
}

function buildContextSection(context?: StoryDiscoveryContext): string {
  if (!context) {
    return ''
  }

  const parts: string[] = []

  if (context.commitRange) {
    parts.push(
      `Commit range: ${context.commitRange.before.slice(0, 7)} → ${context.commitRange.after.slice(0, 7)}`,
    )
  }

  if (context.commitMessages?.length) {
    parts.push(
      `Commit messages:\n${context.commitMessages
        .slice(0, 10)
        .map((message, index) => `${index + 1}. ${message}`)
        .join('\n')}`,
    )
  }

  if (context.clues?.length) {
    parts.push(
      `Feature clues:\n${context.clues.map((clue, index) => `${index + 1}. ${clue}`).join('\n')}`,
    )
  }

  if (context.diffSummary) {
    const diffExcerpt = context.diffSummary.slice(0, 4000)
    const truncated = diffExcerpt.length < context.diffSummary.length
    parts.push(
      `Relevant diff excerpt${truncated ? ' (truncated)' : ''}:\n${diffExcerpt}`,
    )
  }

  return parts.length > 0
    ? dedent`
        # Commit Context
        Mode: ${context.mode ?? 'repo_scan'}

        ${parts.join('\n\n')}
      `
    : ''
}

function buildDiscoveryPrompt(
  repoSlug: string,
  storyCount: number,
  existingStoryTitles: string[] = [],
  context?: StoryDiscoveryContext,
): string {
  const existingStoriesSection =
    existingStoryTitles.length > 0
      ? dedent`\n\n# ⚠️ IMPORTANT: Avoid Existing Stories
          The following stories have already been discovered for this repository. You MUST avoid discovering similar or duplicate stories. Focus on finding NEW and NOVEL features that are not already covered:

          ${existingStoryTitles.map((title, index) => `${index + 1}. ${title}`).join('\n')}

          Your goal is to discover ${storyCount} NEW stories that are:
          - Different from the existing stories listed above
          - Cover features or workflows not already documented
          - Provide novel insights into the codebase
          - Focus on areas that haven't been explored yet

          If you find features that seem similar to existing stories, dig deeper to find unique aspects, edge cases, or alternative user flows that haven't been documented.
        `
      : ''

  const contextSection = buildContextSection(context)

  return dedent`
    Analyze this codebase and discover ${storyCount} user stories that represent the main features and workflows.

    ${existingStoriesSection}

    ${contextSection}

    Explore the codebase using the available tools to understand the structure and identify user-facing features.
    When you have discovered ${storyCount} stories, respond only with the JSON object that matches the schema.
  `
}

export async function runStoryDiscoveryAgent({
  repo,
  options,
}: StoryDiscoveryAgentOptions): Promise<StoryDiscoveryOutput> {
  const sandbox = await getDaytonaSandbox(options.daytonaSandboxId)

  const agent = new Agent({
    model: options?.model ?? agents.discovery.options.model,
    system: buildDiscoveryInstructions(),
    tools: {
      terminalCommand: createTerminalCommandTool({ sandbox }),
      readFile: createReadFileTool({ sandbox }),
      resolveLibrary: createResolveLibraryTool(),
      searchStories: createStorySearchTool({ repoId: repo.id }),
    },
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'story-discovery-v3',
      metadata: {
        repoId: repo.id,
        repoSlug: repo.slug,
        daytonaSandboxId: options.daytonaSandboxId,
        storyCount: options.storyCount,
      },
      tracer: options.telemetryTracer,
    },
    onStepFinish: async (step) => {
      if (step.reasoningText) {
        await streams.append('progress', step.reasoningText)
      }
    },
    stopWhen: stepCountIs(options.maxSteps ?? 30), // Allow more steps for discovery
    experimental_output: Output.object({ schema: storyDiscoveryOutputSchema }),
  })

  const prompt = buildDiscoveryPrompt(
    repo.slug,
    options.storyCount,
    options.existingStoryTitles,
    options.context,
  )

  const result = await agent.generate({ prompt })

  logger.debug('🤖 Story Discovery Agent Result', { result })

  return result.experimental_output
}
