import { Experimental_Agent as Agent, Output, stepCountIs } from 'ai'
import type { Tracer } from '@opentelemetry/api'
import { z } from 'zod'
import zodToJsonSchema from 'zod-to-json-schema'

import { getDaytonaSandbox } from '../../helpers/daytona'
import { createTerminalCommandTool } from '../../tools/terminal-command-tool'
import { createReadFileTool } from '../../tools/read-file-tool'
import { createResolveLibraryTool } from '../../tools/context7-tool'
import { logger } from '@trigger.dev/sdk'
import type { LanguageModel } from 'ai'
import { rawStoryInputSchema } from '@app/schemas'
import { agents } from '../..'

/**
 * Schema for the story discovery output
 * Returns an array of discovered stories
 */
export const storyDiscoveryOutputSchema = z.object({
  stories: z
    .array(rawStoryInputSchema)
    .describe('Array of discovered user stories from the codebase'),
})

export type StoryDiscoveryOutput = z.infer<typeof storyDiscoveryOutputSchema>

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
  }
}

function buildDiscoveryInstructions(): string {
  return `You are an expert software analyst tasked with discovering user stories from a codebase.

# 🎯 Objective
Analyze the codebase to identify user-facing features and workflows. Focus on one specific functionality per story.

# Story Format
Each story must follow the classic agile format:

**As a** [type of user],
**I want** [some goal],
**so that** [some reason].

# Acceptance Criteria
Each story must include acceptance criteria that describe the specific conditions that must be met for the story to be considered complete. List these as bullet points.

# Examples

Example 1 - Password Reset:
\`\`\`
As a registered user,
I want to reset my password,
so that I can regain access to my account if I forget it.

Acceptance Criteria:
- User can request a password reset via email
- Email contains a unique, one-time-use link
- Link expires after 15 minutes
\`\`\`

Example 2 - User Login:
\`\`\`
As a user,
I want to log in with my email and password,
so that I can access my account.

Acceptance Criteria:
- User can enter email and password on the login page
- System validates credentials
- User is redirected to dashboard upon successful login
- Error message is displayed for invalid credentials
\`\`\`

Example 3 - Create Workspace:
\`\`\`
As a logged-in user,
I want to create a new workspace,
so that I can organize my projects.

Acceptance Criteria:
- User can click "create workspace" button from dashboard
- Dialog opens with workspace creation form
- User can enter workspace name and description
- Workspace is created and appears in workspace list
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
- Include acceptance criteria that are specific and measurable
- Keep stories focused on high-level behavior, not low-level code details

# Resources Available
You have read-only tools to:
- Explore repository structure and contents
- Inspect function/class/type names and symbol usage
- Read file contents to understand features

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

function buildDiscoveryPrompt(
  repoSlug: string,
  storyCount: number,
  existingStoryTitles: string[] = [],
): string {
  const existingStoriesSection =
    existingStoryTitles.length > 0
      ? `\n\n# ⚠️ IMPORTANT: Avoid Existing Stories
The following stories have already been discovered for this repository. You MUST avoid discovering similar or duplicate stories. Focus on finding NEW and NOVEL features that are not already covered:

${existingStoryTitles.map((title, index) => `${index + 1}. ${title}`).join('\n')}

Your goal is to discover ${storyCount} NEW stories that are:
- Different from the existing stories listed above
- Cover features or workflows not already documented
- Provide novel insights into the codebase
- Focus on areas that haven't been explored yet

If you find features that seem similar to existing stories, dig deeper to find unique aspects, edge cases, or alternative user flows that haven't been documented.`
      : ''

  return `Repository: ${repoSlug}

Analyze this codebase and discover ${storyCount} user stories that represent the main features and workflows.

Each story must follow the classic agile format:
- **As a** [type of user],
- **I want** [some goal],
- **so that** [some reason].
- Include acceptance criteria as bullet points

Focus on:
- Authentication flows (login, logout, sign up, password reset)
- Navigation and routing features
- CRUD operations (create, read, update, delete)
- Feature workflows with multiple steps
- UI interactions (dialogs, modals, forms, buttons)

Each story should focus on one specific functionality and include acceptance criteria that are specific and measurable.${existingStoriesSection}

Explore the codebase using the available tools to understand the structure and identify user-facing features.

When you have discovered ${storyCount} stories, respond only with the JSON object that matches the schema.`
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
    stopWhen: stepCountIs(options.maxSteps ?? 30), // Allow more steps for discovery
    experimental_output: Output.object({ schema: storyDiscoveryOutputSchema }),
  })

  const prompt = buildDiscoveryPrompt(
    repo.slug,
    options.storyCount,
    options.existingStoryTitles,
  )

  const result = await agent.generate({ prompt })

  logger.debug('🤖 Story Discovery Agent Result', { result })

  return result.experimental_output
}
