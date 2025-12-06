import { Experimental_Agent as Agent, stepCountIs } from 'ai'
import type { Tracer } from '@opentelemetry/api'
import type { LanguageModel } from 'ai'
import { dedent } from 'ts-dedent'

import { agents } from '../../index.js'
import type { Commit } from '@app/schemas'

interface RewriteStoryForChangesOptions {
  commit: Commit
  story: {
    id: string
    name: string
    story: string
  }
  options: {
    scope: string[]
    sandboxId: string
    model?: LanguageModel
    telemetryTracer?: Tracer
    maxSteps?: number
  }
}

/**
 * Rewrite an existing story based on clue, diff, and context
 * Preserves original structure (Given/When/Then/And) for easy diffing
 */
export async function rewriteStoryForChanges({
  commit,
  story,
  options,
}: RewriteStoryForChangesOptions): Promise<string> {
  const {
    scope,
    model: providedModel,
    telemetryTracer,
    maxSteps = 20,
  } = options
  const model = providedModel ?? agents.discovery.options.model

  const agent = new Agent({
    model,
    system: dedent`
      You are an expert story analyst tasked with rewriting an existing user story based on code changes.

      # Your Task
      Rewrite the existing story to reflect the changes indicated by the changelog and code diff.
      The rewritten story should accurately represent the current state of the feature after the code changes.
      We will present your changes to a human in a git-diff format so minor changes in grammar or formatting is not desired.
      Avoid adding additional constraints to the story unless the changelog warrants.
      Do not include a title in your response, we will adjust that at a later time.

      # Critical Requirements
      1. **Preserve Structure**: Keep the original story structure intact (Given/When/Then/And format)
      2. **Maintain Format**: Use the same formatting and structure as the original so diffs are easy to read
      3. **Update Content**: Modify the story text to reflect what changed in the code
      4. **Keep Context**: Preserve any context that hasn't changed
      5. **Be Precise**: Only change what needs to change based on the code diff and changelog

      # Output
      Return the complete rewritten story content doing your best to maintain the original structure and format.

    `,
    tools: {
      // TODO
    },
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'rewrite-story-for-changes',
      metadata: {
        storyId: story.id,
        scope: scope.join('; '),
      },
      tracer: telemetryTracer,
    },
    onStepFinish: async (step) => {
      if (step.reasoningText) {
        // await streams.append('progress', step.reasoningText)
        // TODO
      }
    },
    stopWhen: stepCountIs(maxSteps),
  })

  const prompt = dedent`
    Rewrite the existing story to reflect the code changes indicated in the changelog and code diff.

    <changelog> 
      ${commit.message}
    </changelog>

    <scope>
      ${scope.join('\n')}
    </scope>

    <code-diff>
      ${commit.diff}
    </code-diff>

    <existingStory>
      <title>${story.name}</title>
      <content>${story.story}</content>
    </existingStory>

    # Instructions
    1. Analyze the changelog and code diff to understand what changed
    2. Rewrite the story to reflect these changes within the provided scope (MUST STAY IN SCOPE)
    3. Keep the original structure intact
    4. Maintain the same formatting style
    5. Only modify what needs to change based on the changelog and code diff

    Return the complete rewritten story content.
  `

  const result = await agent.generate({ prompt })

  return result.text
}
