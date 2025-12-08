import {
  type Commit,
  type StoryImpactOutput,
  storyImpactOutputSchema,
} from '@app/schemas'
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

interface FindImpactedStoriesOptions {
  repo: {
    id: string
    slug: string
  }
  commit: Commit
  options: {
    scope: string[]
    model?: LanguageModel
    telemetryTracer?: Tracer
    maxSteps?: number
    storyCount?: number
  }
}

/**
 * Find existing stories that may be impacted by a specific scope(s) change
 * Returns an array of impacted stories with their IDs and scope overlap assessment
 */
export async function findImpactedStories({
  repo,
  commit,
  options: {
    scope,
    model: providedModel,
    telemetryTracer,
    maxSteps = 30,
    storyCount = 10,
  },
}: FindImpactedStoriesOptions): Promise<StoryImpactOutput> {
  const model = providedModel ?? agents.discovery.options.model

  const scopeText = scope.map((s, i) => `${i + 1}. ${s}`).join('\n')
  // const scopeSummary = scope.length === 1 ? scope[0] : `${scope.length} scopes`

  const agent = new Agent({
    model,
    system: dedent`
      You are an expert software analyst tasked with finding existing user stories that are impacted by a specific code change.

      # 🎯 Objective
      Analyze the specific scope and code changes to:
      1. Use the searchStories tool (semantic search) and keywordSearchStories tool (keyword search) to find existing stories that are impacted by this change
      2. Document how they are affected by the code changes
      3. Return only stories that are related to this scope - do NOT create new stories

      # Your Task
      Find up to ${storyCount} stories that concern the following scope:
      ${scopeText}

      Use both search tools to comprehensively find existing stories that might be impacted:
      - Use searchStories to find stories with similar meaning
      - Use keywordSearchStories to find stories with specific terms
      - If you find NO similar stories, return an empty array

      # Output Schema
      \`\`\`json
      ${JSON.stringify(zodToJsonSchema(storyImpactOutputSchema), null, 2)}
      \`\`\`

      # Important
      - Extract the 'id' field from each story found by the search tools
      - For each story, evaluate the body of the story (found in the {story: string} field) and assess the scope overlap
      - Rank the scope overlap as:
        * 'significant': The story directly addresses or heavily overlaps with the scope
        * 'moderate': The story has some relevance to the scope but isn't central
        * 'low': The story has minimal or tangential relevance to the scope
      - Return an array of objects with 'id' and 'scopeOverlap' fields
      - If you find NO similar stories, return an empty array
      - Sort stories by scope overlap (significant first, then moderate, then low)

      # Goal
      Find existing stories impacted by this specific change, assess their scope overlap, and return their IDs with overlap rankings. Do NOT create new stories.
      Focus on the scope: ${scopeText}
    `,
    tools: {
      // TODO
    },
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'find-impacted-stories',
      metadata: {
        repoId: repo.id,
        repoSlug: repo.slug,
        scope,
      },
      tracer: telemetryTracer,
    },
    // eslint-disable-next-line @typescript-eslint/require-await
    onStepFinish: async (step) => {
      if (step.reasoningText) {
        // await streams.append('progress', step.reasoningText)
        // TODO
      }
    },
    stopWhen: stepCountIs(maxSteps),
    experimental_output: Output.object({
      schema: storyImpactOutputSchema,
    }),
  })

  const prompt = dedent`
    Analyze this specific scope and code changes to find existing stories that may be impacted.

    # Specific Scope to Analyze
    ${scopeText}

    # Changed Files
    ${commit.changedFiles.map((f: string) => `- ${f}`).join('\n')}

    # Commit Message
    ${commit.message}

    # Code Diff
    \`\`\`
    ${commit.diff.substring(0, 10000)}${commit.diff.length > 10000 ? '\n... (diff truncated)' : ''}
    \`\`\`

    # Instructions
    1. Use both searchStories (semantic) and keywordSearchStories (keyword) tools to comprehensively search for existing stories that might be impacted by this specific scope
    2. Extract relevant keywords from the scope and code changes to use in keyword search
    3. Use tools to find stories (up to ${storyCount} stories)
    4. For each story found:
       - Extract the 'id' field
       - Read the story body text (found in the 'story' field from search results)
       - Evaluate how well the story overlaps with the scope:
         * 'significant': Story directly addresses or heavily overlaps with the scope
         * 'moderate': Story has some relevance but isn't central to the scope
         * 'low': Story has minimal or tangential relevance to the scope
    5. Return an array of objects with 'id' and 'scopeOverlap' fields (e.g., [{"id": "story-id-1", "scopeOverlap": "significant"}, {"id": "story-id-2", "scopeOverlap": "moderate"}])
    6. Sort results by scope overlap: significant first, then moderate, then low
    7. If NO impacted stories are found, return an empty array

    Respond with the JSON object that matches the schema.
  `

  const result = await agent.generate({ prompt })

  const output = result.experimental_output

  return output
}

export { storyImpactOutputSchema }
