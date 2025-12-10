import {
  createLocalReadFileTool,
  createLocalTerminalCommandTool,
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

// Import agents config to avoid circular dependency
const DEFAULT_MODEL = 'openai/gpt-5-mini'

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
  options?: {
    maxSteps?: number
    model?: LanguageModel
    telemetryTracer?: Tracer
    progress?: (message: string) => void
  }
}

/**
 * Analyzes uncommitted changes (both staged and unstaged) and suggests
 * how to organize them into logical, sequential commits.
 */
export async function analyzeStagingSuggestions({
  scope,
  options: {
    maxSteps = 40,
    model: providedModel,
    telemetryTracer,
    progress,
  } = {},
}: AnalyzeStagingSuggestionsOptions): Promise<StagingSuggestionsOutput> {
  const model = providedModel ?? DEFAULT_MODEL
  const agent = new Agent({
    model,
    system: dedent`
      You are a senior engineer who helps organize code changes into logical, sequential commits.
      Your goal is to analyze uncommitted changes (both staged and unstaged) and suggest how to
      organize them into smaller, focused commits that tell a clear story.

      # Your Task
      1. Retrieve all uncommitted changes (both staged and unstaged files)
      2. Read the relevant files to understand what changed
      3. Analyze dependencies and logical relationships between changes
      4. Group related changes together
      5. Suggest a sequence of commits with clear commit messages

      # Retrieving Changes
      - Use \`git status --porcelain\` to see all uncommitted changes (staged and unstaged)
      - Use \`git diff --cached --name-only\` to list staged files
      - Use \`git diff --cached\` to see staged changes
      - Use \`git diff --name-only\` to list unstaged modified files
      - Use \`git diff\` to see unstaged changes
      - Use \`git ls-files --others --exclude-standard\` to list untracked files
      - Use \`git diff --cached <file>\` to see staged changes for a specific file
      - Use \`git diff <file>\` to see unstaged changes for a specific file

      # Tools Available
      - **terminalCommand**: Execute git commands to retrieve change information
      - **readFile**: Read files from the repository to analyze their content

      # Important Instructions
      - Analyze ALL uncommitted changes (both staged and unstaged)
      - Group files by logical relationship:
        * Files that implement a single feature together
        * Files that share dependencies (e.g., if A imports B, they might go together)
        * Files that are part of the same refactoring
        * Configuration changes together
        * Test files with their corresponding implementation files
      - Order commits by dependency: foundational changes first, dependent changes later
      - Each commit should be focused and self-contained when possible
      - Suggest clear, descriptive commit messages following conventional commit format when appropriate
      - Include all changed files in your suggestions (don't leave any out)
      - For each suggestion:
        * **order**: Sequential number (1, 2, 3, etc.) indicating the order to stage/commit
        * **commitMessage**: A clear commit message (e.g., "Add user authentication", "Fix bug in data validation")
        * **files**: Array of file paths relative to git root
        * **reasoning**: Brief explanation of why these files belong together (optional but helpful)
      - If there are no changes, return an empty suggestions array
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

  const scopeDescription =
    scope.type === 'commit'
      ? `commit ${scope.commit}`
      : scope.type === 'commits'
        ? `commits ${scope.commits.join(', ')}`
        : scope.type === 'staged'
          ? 'staged changes'
          : scope.type === 'unstaged'
            ? 'unstaged changes'
            : `specified paths: ${scope.paths.join(', ')}`

  const prompt = dedent`
    Analyze all uncommitted changes (both staged and unstaged) and suggest how to organize
    them into logical, sequential commits.

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

  return result.experimental_output
}
