import {
  createLocalReadFileTool,
  createLocalTerminalCommandTool,
  findGitRoot,
  getUncommittedFilePaths,
} from '@app/shell'
import { type VibeCheckScope } from '@app/types'
import { type Tracer } from '@opentelemetry/api'
import {
  Experimental_Agent as Agent,
  type LanguageModel,
  Output,
  stepCountIs,
} from 'ai'
import { dedent } from 'ts-dedent'
import { z } from 'zod'

export const stagingSuggestionsOutputSchema = z.object({
  suggestions: z.array(
    z.object({
      order: z
        .number()
        .describe('The sequential order for this commit (1, 2, 3, etc.)'),
      commitMessage: z
        .string()
        .describe('A clear, concise commit message for this group of changes'),
      files: z
        .array(z.string())
        .describe(
          'Array of file paths (relative to git root) to stage for this commit',
        ),
      reasoning: z
        .string()
        .optional()
        .describe('Brief explanation of why these files belong together'),
    }),
  ),
})
type StagingSuggestionsOutput = z.infer<typeof stagingSuggestionsOutputSchema>

interface AnalyzeStagingSuggestionsOptions {
  scope: VibeCheckScope
  instructions?: string
  options: {
    maxSteps?: number
    model: LanguageModel
    telemetryTracer?: Tracer
    progress?: (message: string) => void
  }
}

/**
 * Analyzes uncommitted changes (both staged and unstaged) and suggests
 * how to organize them into logical, sequential commits.
 */
export async function analyzeStagingSuggestions({
  scope: _scope,
  instructions,
  options: { maxSteps = 20, model, telemetryTracer, progress },
}: AnalyzeStagingSuggestionsOptions): Promise<StagingSuggestionsOutput> {
  const gitRoot = await findGitRoot()
  const uncommittedFilePaths = await getUncommittedFilePaths(gitRoot)

  const agent = new Agent({
    model,
    system: dedent`
      You are a senior engineer who helps organize code changes into logical, sequential commits.
      Your goal is to analyze uncommitted changes (both staged and unstaged) and suggest how to
      organize them into focused commits that tell a clear story.

      ${
        instructions
          ? dedent`
            # User Instructions
            The user provided additional instructions. Follow them when grouping changes and writing commit messages:
            ${instructions}
          `
          : ''
      }
    `,
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'staging-suggestions',
      tracer: telemetryTracer,
    },
    tools: {
      terminalCommand: createLocalTerminalCommandTool(progress),
      readFile: createLocalReadFileTool(progress),
    },
    stopWhen: stepCountIs(maxSteps),
    onStepFinish: (step) => {
      if (step.reasoningText && step.reasoningText !== '[REDACTED]') {
        progress?.(step.reasoningText)
      }
    },
    experimental_output: Output.object({
      schema: stagingSuggestionsOutputSchema,
    }),
  })

  const prompt = dedent`
    Analyze all uncommitted changes (both staged and unstaged) and suggest how to organize
    them into logical, sequential commits.

    ${instructions ? `User instructions: ${instructions}` : ''}

    Here is the authoritative list of uncommitted files (including untracked). You MUST include
    every file from this list in your suggestions:
    ${uncommittedFilePaths.map((p) => `- ${p}`).join('\n')}

    Use the available tools to:
    1. Get a complete list of all uncommitted files (staged + unstaged + untracked)
    2. Read the changed files to understand what was modified
    3. Analyze dependencies and relationships between changes
    4. Group related changes together
    5. Order the groups by dependency (foundational changes first)

    Return suggestions as an array of commit groups, each with:
    - order: Sequential number (1, 2, 3, etc.)
    - commitMessage: Clear, descriptive commit message
    - files: Array of file paths to stage for this commit
    - reasoning: Brief explanation (optional)

    Make sure to include ALL uncommitted files in your suggestions.
    Respond with JSON matching the schema.
  `

  const result = await agent.generate({
    prompt,
  })

  // Ensure we include untracked/new files even if the model forgets them.
  const output = result.experimental_output
  const suggestedFiles = new Set<string>()
  for (const suggestion of output.suggestions) {
    for (const file of suggestion.files) {
      suggestedFiles.add(file)
    }
  }

  const missing = uncommittedFilePaths.filter((p) => !suggestedFiles.has(p))
  if (missing.length === 0) {
    return output
  }

  const maxOrder = output.suggestions.reduce(
    (acc, s) => Math.max(acc, s.order),
    0,
  )

  return {
    suggestions: [
      ...output.suggestions,
      {
        order: maxOrder + 1,
        commitMessage: 'chore: commit remaining changes',
        files: missing,
        reasoning:
          'These files were uncommitted (including untracked/new files) but were not included in the initial suggestions.',
      },
    ],
  }
}
