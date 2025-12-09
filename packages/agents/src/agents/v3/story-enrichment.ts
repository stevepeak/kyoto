import { type DiscoveredStory, discoveredStorySchema } from '@app/schemas'
import {
  createLocalReadFileTool,
  createLocalTerminalCommandTool,
} from '@app/shell'
import { type Tracer } from '@opentelemetry/api'
import {
  Experimental_Agent as Agent,
  type LanguageModel,
  Output,
  stepCountIs,
} from 'ai'
import { dedent } from 'ts-dedent'
import { zodToJsonSchema } from 'zod-to-json-schema'

import { agents } from '../../index'

type StoryEnrichmentAgentOptions = {
  story: DiscoveredStory
  options: {
    maxSteps?: number
    model?: LanguageModel
    telemetryTracer?: Tracer
    logger?: (message: string) => void
  }
}

/**
 * System instructions for story enrichment
 */
function buildSystemInstructions(): string {
  return dedent`
    You are an expert at enriching user stories with detailed context from the codebase.

    # Your Task

    Take a discovered user story and enrich it with additional details by researching the codebase.

    # What to Enrich

    1. **Dependencies** - Research and add detailed information:
       * Entry point: Where does the user access this feature? (routes, pages, components)
       * Exit point: What happens after this behavior? Where does the user go next?
       * Prerequisites: What must be true before this behavior can occur? (user state, data, permissions)
       * Side effects: What user-visible changes occur? (UI updates, notifications, data changes)

    2. **Code References** - Expand code references to include:
       * All files that contribute to this behavior
       * Related components, utilities, and services
       * Entry points and navigation paths
       * Format: \`filepath:lineStart:lineEnd\`

    3. **Acceptance Criteria** - Ensure acceptance criteria are:
       * User-visible and testable
       * Specific and measurable
       * Cover all aspects of the behavior

    # How to Work

    1. Use the \`readFile\` tool to examine files referenced in the story
    2. Use the \`terminalCommand\` tool to explore the codebase structure
    3. Trace code paths to understand entry points, exit points, and dependencies
    4. Identify all files that contribute to the user behavior
    5. Return the enriched story with complete dependencies and code references

    # Important

    - Do NOT write files
    - Do NOT generate embeddings
    - Do NOT create composition
    - Focus ONLY on enriching the story with codebase context
    - Return the enriched story as a DiscoveredStory object

    # Story Format
    \`\`\`json
    ${JSON.stringify(zodToJsonSchema(discoveredStorySchema), null, 2)}
    \`\`\`
  `
}

/**
 * Prompt builder for story enrichment
 */
function buildPrompt(story: DiscoveredStory): string {
  return dedent`
    Enrich this user story with detailed context from the codebase.

    Story to enrich:
    Title: ${story.title}
    Behavior: ${story.behavior}
    ${story.dependencies ? `Current Dependencies: ${JSON.stringify(story.dependencies, null, 2)}` : 'Dependencies: None'}
    Acceptance Criteria: ${story.acceptanceCriteria.join(', ')}
    Code References: ${story.codeReferences.map((ref) => `${ref.file}:${ref.lines}`).join(', ')}

    Research the codebase to:
    1. Find entry points (where user accesses this feature)
    2. Find exit points (what happens next)
    3. Identify prerequisites (what must be true before)
    4. Identify side effects (user-visible changes)
    5. Expand code references to include all contributing files

    Return the enriched story with complete dependencies and code references.
  `
}

type StoryEnrichmentResult = {
  story: DiscoveredStory
}

export async function runStoryEnrichmentAgent(
  options: StoryEnrichmentAgentOptions,
): Promise<StoryEnrichmentResult> {
  const { story } = options
  const {
    maxSteps = 20,
    model = agents.discovery.options.model,
    telemetryTracer,
    logger,
  } = options.options

  const agent = new Agent({
    model,
    system: buildSystemInstructions(),
    tools: {
      terminalCommand: createLocalTerminalCommandTool(logger),
      readFile: createLocalReadFileTool(logger),
    },
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'story-enrichment-v3',
      metadata: {
        storyTitle: story.title,
      },
      tracer: telemetryTracer,
    },
    onStepFinish: (step) => {
      if (step.reasoningText && step.reasoningText !== '[REDACTED]') {
        logger?.(step.reasoningText)
      }
    },
    stopWhen: stepCountIs(maxSteps),
    experimental_output: Output.object({
      schema: discoveredStorySchema,
    }),
  })

  const prompt = buildPrompt(story)

  const result = await agent.generate({ prompt })
  const enrichedStory = result.experimental_output

  return { story: enrichedStory }
}
