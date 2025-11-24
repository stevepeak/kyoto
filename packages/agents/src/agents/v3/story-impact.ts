import { Experimental_Agent as Agent, Output, stepCountIs } from 'ai'
import type { Tracer } from '@opentelemetry/api'
import type { LanguageModel } from 'ai'
import { dedent } from 'ts-dedent'
import { logger, streams } from '@trigger.dev/sdk'
import zodToJsonSchema from 'zod-to-json-schema'

import { getDaytonaSandbox } from '../../helpers/daytona'
import { createTerminalCommandTool } from '../../tools/terminal-command-tool'
import { createReadFileTool } from '../../tools/read-file-tool'
import { createResolveLibraryTool } from '../../tools/context7-tool'
import { createSearchStoriesTool } from '../../tools/search-stories-tool'
import {
  agents,
  storyDiscoveryOutputSchema,
  type StoryDiscoveryOutput,
} from '../..'
import type { setupDb } from '@app/db'

type DbClient = ReturnType<typeof setupDb>

export interface FindImpactedStoriesOptions {
  clue: string
  db: DbClient
  repo: {
    id: string
    slug: string
  }
  sandboxId: string
  commitMessages: string[]
  codeDiff: string
  changedFiles: string[]
  model?: LanguageModel
  telemetryTracer?: Tracer
  maxSteps?: number
}

/**
 * Find existing stories that may be impacted by a specific clue
 * Uses the discovery agent to search for and identify related stories
 */
export async function findImpactedStories({
  clue,
  db,
  repo,
  sandboxId,
  commitMessages,
  codeDiff,
  changedFiles,
  model: providedModel,
  telemetryTracer,
  maxSteps = 30,
}: FindImpactedStoriesOptions): Promise<StoryDiscoveryOutput> {
  const model = providedModel ?? agents.discovery.options.model
  const sandbox = await getDaytonaSandbox(sandboxId)

  const agent = new Agent({
    model,
    system: dedent`
      You are an expert software analyst tasked with finding existing user stories that are impacted by a specific code change.

      # 🎯 Objective
      Analyze the specific clue and code changes to:
      1. Use the searchStories tool to find existing stories that are impacted by this change
      2. Document how they are affected by the code changes
      3. Return only stories that are related to this clue - do NOT create new stories

      # Story Format
      Each story must follow the classic agile format:

      **Given** [some initial context or state], (optional)
      **When** [an action is taken],
      **Then** [an expected outcome occurs].
      **And** [another action is taken], (optional)

      # Your Task
      Focus on this specific clue: "${clue}"

      Use the searchStories tool to search for existing stories that might be impacted by this change.
      - Look for semantically similar stories (similarity > 0.7) that are likely impacted
      - Return only existing stories that are related to this clue
      - If you find NO similar stories, return an empty array - do NOT create new stories

      # Output Guidelines
      - Write stories in clear, natural language
      - Focus on one specific functionality per story
      - Focus on user-facing features, not implementation details
      - Each story should represent a complete, testable feature
      - Include 0 - 2 additional acceptance criteria to clarify anything that is ambiguous
      - Keep stories focused on high-level behavior, not low-level code details
      - Never include source code or symbol references in the stories
      - Keep it simple, keep it short. But have the story have enough detail to be useful as a test
      - Do not use temporal adverbs like "immediately", "instantly", "right away", etc. if necessary use the word "then" or "after" instead
      - Aim for no ambiguous statements. Do not use "should" in the stories. Use "then" instead

      # Resources Available
      You have read-only tools to:
      - Explore repository structure and contents
      - Inspect function/class/type names and symbol usage
      - Read file contents to understand features
      - Search for existing stories for the repository (use searchStories tool to find impacted stories)

      # Output Schema
      \`\`\`json
      ${JSON.stringify(zodToJsonSchema(storyDiscoveryOutputSchema as any), null, 2)}
      \`\`\`

      # Goal
      Find existing stories impacted by this specific change. Do NOT create new stories.
      Focus on the clue: "${clue}"
    `,
    tools: {
      terminalCommand: createTerminalCommandTool({ sandbox }),
      readFile: createReadFileTool({ sandbox }),
      resolveLibrary: createResolveLibraryTool(),
      searchStories: createSearchStoriesTool({ db, repoId: repo.id }),
    } as any,
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'find-impacted-stories',
      metadata: {
        repoId: repo.id,
        repoSlug: repo.slug,
        daytonaSandboxId: sandboxId,
        clue,
      },
      tracer: telemetryTracer,
    },
    onStepFinish: async (step) => {
      if (step.reasoningText) {
        await streams.append('progress', step.reasoningText)
      }
    },
    stopWhen: stepCountIs(maxSteps),
    experimental_output: Output.object({
      schema: storyDiscoveryOutputSchema as any,
    }),
  })

  const prompt = dedent`
    Analyze this specific clue and code changes to find existing stories that may be impacted.

    # Specific Clue to Analyze
    ${clue}

    # Changed Files
    ${changedFiles.map((f) => `- ${f}`).join('\n')}

    # Commit Messages
    ${commitMessages.map((msg, i) => `${i + 1}. ${msg}`).join('\n')}

    # Code Diff
    \`\`\`
    ${codeDiff.substring(0, 10000)}${codeDiff.length > 10000 ? '\n... (diff truncated)' : ''}
    \`\`\`

    # Instructions
    1. Use the searchStories tool to search for existing stories that might be impacted by this specific clue
    2. If you find impacted stories (similarity > 0.7), return them in the output
    3. If NO impacted stories are found, return an empty array - do NOT create new stories
    4. Focus your analysis on this specific clue: "${clue}"

    When you have completed your analysis, respond with the JSON object that matches the schema.
  `

  logger.info('Finding impacted stories for clue', {
    clue,
    repoId: repo.id,
  })

  void streams.append(
    'progress',
    `Finding impacted stories for clue: "${clue}"`,
  )

  const result = await agent.generate({ prompt })

  const output = result.experimental_output as StoryDiscoveryOutput

  logger.debug('Clue processing result', {
    clue,
    storiesFound: output.stories.length,
  })

  return output
}
