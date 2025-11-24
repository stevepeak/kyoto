import { Experimental_Agent as Agent, stepCountIs } from 'ai'
import type { Tracer } from '@opentelemetry/api'
import type { LanguageModel } from 'ai'
import { dedent } from 'ts-dedent'
import { logger, streams } from '@trigger.dev/sdk'

import { getDaytonaSandbox } from '../../helpers/daytona'
import { createTerminalCommandTool } from '../../tools/terminal-command-tool'
import { createReadFileTool } from '../../tools/read-file-tool'
import { createResolveLibraryTool } from '../../tools/context7-tool'
import { agents } from '../..'

export interface RewriteStoryForChangesOptions {
  clue: string
  codeDiff: string
  commitMessages: string[]
  changedFiles: string[]
  existingStory: {
    id: string
    name: string
    story: string
  }
  sandboxId: string
  model?: LanguageModel
  telemetryTracer?: Tracer
  maxSteps?: number
}

/**
 * Rewrite an existing story based on clue, diff, and context
 * Preserves original structure (Given/When/Then/And) for easy diffing
 */
export async function rewriteStoryForChanges({
  clue,
  codeDiff,
  commitMessages,
  changedFiles,
  existingStory,
  sandboxId,
  model: providedModel,
  telemetryTracer,
  maxSteps = 20,
}: RewriteStoryForChangesOptions): Promise<string> {
  const model = providedModel ?? agents.discovery.options.model
  const sandbox = await getDaytonaSandbox(sandboxId)

  const agent = new Agent({
    model,
    system: dedent`
      You are an expert story analyst tasked with rewriting an existing user story based on code changes.

      # Your Task
      Rewrite the existing story to reflect the changes indicated by the clue and code diff.
      The rewritten story should accurately represent the current state of the feature after the code changes.

      # Critical Requirements
      1. **Preserve Structure**: Keep the original story structure intact (Given/When/Then/And format)
      2. **Maintain Format**: Use the same formatting and structure as the original so diffs are easy to read
      3. **Update Content**: Modify the story text to reflect what changed in the code
      4. **Keep Context**: Preserve any context that hasn't changed
      5. **Be Precise**: Only change what needs to change based on the code diff and clue

      # Story Format
      Stories follow the classic agile format:
      **Given** [some initial context or state], (optional)
      **When** [an action is taken],
      **Then** [an expected outcome occurs].
      **And** [another action is taken], (optional)

      # Output
      Return the complete rewritten story text, maintaining the original structure and format.
    `,
    tools: {
      terminalCommand: createTerminalCommandTool({ sandbox }),
      readFile: createReadFileTool({ sandbox }),
      resolveLibrary: createResolveLibraryTool(),
    } as any,
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'rewrite-story-for-changes',
      metadata: {
        storyId: existingStory.id,
        clue,
        daytonaSandboxId: sandboxId,
      },
      tracer: telemetryTracer,
    },
    onStepFinish: async (step) => {
      if (step.reasoningText) {
        await streams.append('progress', step.reasoningText)
      }
    },
    stopWhen: stepCountIs(maxSteps),
  })

  const prompt = dedent`
    Rewrite the existing story to reflect the code changes indicated by the clue.

    # Clue
    ${clue}

    # Existing Story
    **Title:** ${existingStory.name}
    **Story Text:**
    ${existingStory.story}

    # Code Changes Context
    **Changed Files:**
    ${changedFiles.map((f) => `- ${f}`).join('\n')}

    **Commit Messages:**
    ${commitMessages.map((msg, i) => `${i + 1}. ${msg}`).join('\n')}

    **Code Diff (truncated - sandbox available for full context):**
    \`\`\`
    ${codeDiff.substring(0, 10000)}${codeDiff.length > 10000 ? '\n... (diff truncated)' : ''}
    \`\`\`

    # Instructions
    1. Analyze the clue and code changes to understand what changed
    2. Rewrite the story to reflect these changes
    3. Keep the original structure (Given/When/Then/And) intact
    4. Maintain the same formatting style
    5. Only modify what needs to change based on the code diff

    Return the complete rewritten story text.
  `

  logger.info('Rewriting story for changes', {
    existingStoryId: existingStory.id,
    existingStoryName: existingStory.name,
    clue,
  })

  void streams.append(
    'progress',
    `Rewriting story "${existingStory.name}" based on clue: "${clue}"`,
  )

  const result = await agent.generate({ prompt })

  return result.text
}

