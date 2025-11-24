import { Experimental_Agent as Agent, Output, stepCountIs } from 'ai'
import type { Tracer } from '@opentelemetry/api'
import { z } from 'zod'
import zodToJsonSchema from 'zod-to-json-schema'

import { getDaytonaSandbox } from '../../helpers/daytona'
import { createTerminalCommandTool } from '../../tools/terminal-command-tool'
import { createReadFileTool } from '../../tools/read-file-tool'
import { createResolveLibraryTool } from '../../tools/context7-tool'
import { createSearchStoriesTool } from '../../tools/search-stories-tool'
import { logger, streams } from '@trigger.dev/sdk'
import type { LanguageModel } from 'ai'
import { rawStoryInputSchema, type Commit } from '@app/schemas'
import { agents } from '../..'
import { dedent } from 'ts-dedent'
import type { setupDb } from '@app/db'

type DbClient = ReturnType<typeof setupDb>

/**
 * Schema for the story discovery output
 * Returns an array of discovered stories
 */
export const storyDiscoveryOutputSchema = z.object({
  stories: z.array(rawStoryInputSchema),
})

export type StoryDiscoveryOutput = z.infer<typeof storyDiscoveryOutputSchema>

type StoryDiscoveryAgentOptions = {
  db: DbClient
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
    context?: {
      scope: string[]
      commit: Commit
    }
  }
}

function buildDiscoveryInstructions(context?: {
  scope: string[]
  commit: Commit
}): string {
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

    ${
      context
        ? dedent`
    # Scope-Based Discovery (When Context is Provided)
    When context is provided with a required scope:
    - **The scope defines WHAT you must discover** - focus your discovery strictly within the scope boundaries
    - **The commit message, code diff, and changed files are supporting details** that help you understand HOW the scope was implemented
    - **Code changes must be captured in the story** - ensure the story reflects the behaviors and functionality shown in the code changes
    - Use the code diff to understand:
      * What new code was added (new features, functions, components)
      * What existing code was modified (changed behaviors, updated logic)
      * What files were affected (which parts of the system changed)
    - The story should describe the user-facing impact of these code changes, not the code itself
    `
        : ''
    }

    # Output Guidelines
    - Write stories in clear, natural language
    - Focus on one specific functionality per story
    - Focus on user-facing features, not implementation details
    - Each story should represent a complete, testable feature
    - Include 0 - 2 additional acceptance criteria to clarify anything that is ambiguous or requiring refinement
    - Keep stories focused on high-level behavior, not low-level code details
    ${context ? '- When context is provided: ensure the story captures the code changes as user-facing behaviors' : ''}

    # Resources Available
    You have read-only tools to:
    - Explore repository structure and contents
    - Inspect function/class/type names and symbol usage
    - Read file contents to understand features
    - Search for existing stories for the repository (use searchStories tool to avoid duplicates)

    # Rules
    - Never include source code or symbol references in the stories.
    - Keep it simple, keep it short. But have the story have enough detail to be useful as a test.
    - Do not use temporal adverbs like "immediately", "instantly", "right away", etc. if necessary use the word "then" or "after" instead.
    - Aim for no ambiguous statements. Do not use "should" in the stories. Use "then" instead.
    ${context ? '- When context is provided: the story must reflect the code changes as user behaviors, ensuring the diff is captured in the story narrative' : ''}

    Use these tools to understand the codebase structure and identify user-facing features.

    # Output Schema
    \`\`\`json
    ${JSON.stringify(zodToJsonSchema(storyDiscoveryOutputSchema), null, 2)}
    \`\`\`

    # Goal
    Discover and document user stories that represent the main features and workflows in this codebase.
    Focus on high-level user interactions, not implementation details.
    ${context ? 'When scope is provided, ensure all discovered stories relate to that scope and capture the code changes as user-facing behaviors.' : ''}
  `
}

function buildDiscoveryPrompt(
  repoSlug: string,
  storyCount: number,
  context?: {
    scope: string[]
    commit: Commit
  },
): string {
  const existingStoriesSection = dedent`
    
    # 🔍 Using searchStories Tool to Avoid Duplicates
    
    Before finalizing your discovered stories, you MUST use the searchStories tool to check for semantically similar existing stories. This will help you:
    
    - Identify gaps between existing stories (what's missing)
    - Avoid writing duplicate stories that are too similar to existing ones
    - Find opportunities to discover novel features in areas not yet covered
    - Understand the semantic landscape of already-discovered stories
    
    **Workflow:**
    1. As you explore the codebase and identify potential stories, use searchStories to check if similar stories already exist
    2. If you find semantically similar stories (high similarity scores), dig deeper to find unique aspects, edge cases, or alternative user flows that haven't been documented
    3. Focus on discovering stories that fill gaps between existing stories - look for features or workflows that exist in the code but aren't covered by current stories
    4. Use the search results to guide your discovery toward novel, non-duplicate features
    
    Your goal is to discover ${storyCount} NEW stories that:
    - Are semantically distinct from existing stories (use searchStories to verify)
    - Cover features or workflows not already documented
    - Fill gaps between existing stories
    - Provide novel insights into areas of the codebase that haven't been explored yet
  `

  const contextSection = context
    ? dedent`
    
    # 📝 Context - Scope-Focused Discovery
    You are analyzing a specific set of commits with a REQUIRED SCOPE for discovery. The scope defines what area or feature you must focus on when discovering stories.

    ## Required Scope
    ${context.scope.map((scope, i) => `${i + 1}. ${scope}`).join('\n')}

    **CRITICAL**: Your discovery MUST be focused on the scope(s) listed above. All stories you discover must relate directly to these scopes. The commit message, code diff, and changed files are supporting details that help you understand HOW the scope was implemented, but the SCOPE is what defines WHAT you should discover.

    ## Supporting Details (Use to understand the scope implementation)

    ### Changed Files
    ${context.commit.changedFiles.map((f: string) => `- ${f}`).join('\n')}

    ### Commit Message
    ${context.commit.message}

    ### Code Diff
    \`\`\`
    ${context.commit.diff.substring(0, 10000)}${context.commit.diff.length > 10000 ? '\n... (diff truncated)' : ''}
    \`\`\`

    ## Discovery Instructions
    When discovering stories:
    1. **Primary Focus**: The required scope(s) define what feature or area you must discover stories for
    2. **Supporting Context**: Use the commit message, code diff, and changed files to understand:
       - How the scope was implemented
       - What code changes support the scope
       - What user-facing behaviors were added or modified
    3. **Story Requirements**: Each story you discover must:
       - Directly relate to at least one of the required scopes
       - Capture the code changes that implement the scope (describe the behavior, not the code itself)
       - Reflect the user-facing impact of the changes shown in the diff
    4. **Code Change Integration**: Ensure your stories capture:
       - New functionality introduced in the code changes
       - Modified behaviors reflected in the diff
       - User interactions enabled by the changed files

    Use the searchStories tool to check existing stories and compare against what you discover within the required scope.
  `
    : ''

  return dedent`
    Analyze this codebase and discover ${storyCount} user stories that represent the main features and workflows.

    ${existingStoriesSection}
    ${contextSection}

    Explore the codebase using the available tools to understand the structure and identify user-facing features.
    When you have discovered ${storyCount} stories, respond only with the JSON object that matches the schema.
  `
}

export async function runStoryDiscoveryAgent({
  db,
  repo,
  options,
}: StoryDiscoveryAgentOptions): Promise<StoryDiscoveryOutput> {
  const sandbox = await getDaytonaSandbox(options.daytonaSandboxId)

  const agent = new Agent({
    model: options?.model ?? agents.discovery.options.model,
    system: buildDiscoveryInstructions(options.context),
    tools: {
      terminalCommand: createTerminalCommandTool({ sandbox }),
      readFile: createReadFileTool({ sandbox }),
      resolveLibrary: createResolveLibraryTool(),
      searchStories: createSearchStoriesTool({ db, repoId: repo.id }),
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
    options.context,
  )

  const result = await agent.generate({ prompt })

  logger.debug('🤖 Story Discovery Agent Result', { result })

  return result.experimental_output
}
