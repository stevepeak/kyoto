import { Experimental_Agent as Agent, Output, stepCountIs } from 'ai'
import type { Tracer } from '@opentelemetry/api'
import { z } from 'zod'
import zodToJsonSchema from 'zod-to-json-schema'

import { getDaytonaSandbox } from '../../helpers/daytona'
import { createTerminalCommandTool } from '../../tools/terminal-command-tool'
import { createReadFileTool } from '../../tools/read-file-tool'
import { createResolveLibraryTool } from '../../tools/context7-tool'
import { createLspTool } from '../../tools/lsp-tool'
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
  return `You are an expert software analyst tasked with discovering high-level user stories from a codebase.

# 🎯 Objective
Analyze the codebase to identify user-facing features and workflows. Focus on high-level user interactions and flows, such as:
- Authentication flows (login, logout, sign up)
- Navigation and routing
- User actions (create, edit, delete operations)
- Feature workflows (e.g., "given a user is logged in; given they have navigated to dashboard; when the user clicks 'create workspace' then a dialog...")

# Discovery Focus
Look for:
1. **Authentication & Authorization**: Login, logout, sign up, password reset flows
2. **Navigation**: Page routing, menu navigation, breadcrumbs
3. **User Actions**: CRUD operations, form submissions, button clicks that trigger workflows
4. **Feature Flows**: Multi-step user journeys (e.g., create workspace → configure → save)
5. **UI Interactions**: Dialog opens/closes, modal interactions, dropdown selections

# Story Format
Each discovered story should be written in Gherkin or natural language format, following this pattern:
- Feature: [Feature name]
- As a [user type]
- I want to [action]
- So that [benefit]

- Scenario: [Scenario name]
  - Given [precondition]
  - When [action]
  - Then [expected outcome]

# Examples of Good Stories

Example 1 - Login Flow:
\`\`\`
Feature: User Login
  As a user
  I want to log in with my email and password
  So that I can access my account

  Scenario: Successful login
    Given I am on the login page
    When I enter my email and password
    Then I should be logged in
\`\`\`

Example 2 - Create Workspace:
\`\`\`
Feature: Create Workspace
  As a logged-in user
  I want to create a new workspace
  So that I can organize my projects

  Scenario: Create workspace from dashboard
    Given I am logged in
    And I have navigated to the dashboard
    When I click "create workspace"
    Then a dialog should open
    And I can enter workspace details
    And the workspace is created
\`\`\`

Example 3 - Logout:
\`\`\`
Feature: User Logout
  As a logged-in user
  I want to log out
  So that I can secure my session

  Scenario: Logout from menu
    Given I am logged in
    When I click the logout button
    Then I should be logged out
    And redirected to the login page
\`\`\`

# Output Guidelines
- Write stories in clear, natural language
- Focus on user-facing features, not implementation details
- Each story should represent a complete user workflow
- Include both the feature description and at least one scenario
- Use Gherkin keywords (Given, When, Then, And, But) when appropriate
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

Analyze this codebase and discover ${storyCount} high-level user stories that represent the main features and workflows.

Focus on:
- Authentication flows (login, logout, sign up)
- Navigation and routing
- User actions (create, edit, delete operations)
- Feature workflows with multiple steps
- UI interactions (dialogs, modals, forms)

Each story should be written in Gherkin or natural language format with:
- A feature description
- At least one scenario with Given/When/Then steps${existingStoriesSection}

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
      lsp: createLspTool({ sandbox }),
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
