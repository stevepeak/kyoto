import {
  type DiffEvaluatorOutput,
  diffEvaluatorOutputSchema,
} from '@app/schemas'
import {
  createLocalReadFileTool,
  createLocalTerminalCommandTool,
} from '@app/shell'
import {
  Experimental_Agent as Agent,
  type LanguageModel,
  Output,
  stepCountIs,
  type Tool,
} from 'ai'
import { dedent } from 'ts-dedent'
import { zodToJsonSchema } from 'zod-to-json-schema'

import { agents } from '../../index'

export type DiffEvaluationTarget =
  | { type: 'commit'; commitSha: string }
  | { type: 'staged' }
  | { type: 'unstaged' }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Logger = (message: any | string) => void

interface DiffEvaluatorOptions {
  target: DiffEvaluationTarget
  searchStoriesTool: Tool
  options?: {
    maxSteps?: number
    model?: LanguageModel
    logger?: Logger
  }
}

function buildSystemInstructions(target: DiffEvaluationTarget): string {
  const targetDescription =
    target.type === 'commit'
      ? `a git commit (${target.commitSha})`
      : target.type === 'staged'
        ? 'the currently staged (indexed) changes'
        : 'unstaged changes (including untracked files)'

  const retrievalGuidance =
    target.type === 'commit'
      ? dedent`
          - Use \`git show <sha>\` to see the commit details and diff
          - Use \`git show --name-only <sha>\` to see just the changed files
          - Use \`git log -1 --format=<format> <sha>\` to get commit metadata
          - Use \`git diff <sha>^..<sha>\` to see what changed
        `
      : target.type === 'staged'
        ? dedent`
          - Use \`git diff --cached\` to see the staged changes and diff
          - Use \`git diff --cached --name-only\` to list staged files
          - Use \`git status --short\` to understand what is currently staged
        `
        : dedent`
          - Use \`git diff\` to see unstaged changes (modified files)
          - Use \`git diff --name-only\` to list modified files
          - Use \`git ls-files --others --exclude-standard\` to list untracked files
          - Use \`git status --short\` to see all changes (staged and unstaged)
        `

  return dedent`
    You are an expert code analyst tasked with evaluating ${targetDescription} to determine if any user stories are impacted by the changes.

    # Your Task
    You must determine if any user stories are impacted by this work by:
    1. Retrieving the change details using git commands (use terminalCommand)
    2. Understanding what files were changed and what the changes do
    3. Searching for relevant user stories using the searchStories tool
    4. Evaluating which stories are impacted and assessing the scope overlap
    5. Returning a structured response with text explanation and impacted stories

    # Tools Available
    - **terminalCommand**: Execute git commands to retrieve change information
${retrievalGuidance}
    - **searchStories**: Search through user stories in .kyoto/stories directory
      - Use keywords from the change summary and changed files to find relevant stories
      - Search for stories related to the functionality being changed
    - **readFile**: Read files from the repository or story files to understand context

    # Output Schema
    You must return a JSON object matching this schema:
    \`\`\`json
    ${JSON.stringify(zodToJsonSchema(diffEvaluatorOutputSchema), null, 2)}
    \`\`\`

    # Important Instructions
    - Analyze the changes thoroughly
    - Use searchStories to find stories that might be impacted
    - For each impacted story, assess the scope overlap:
      * 'significant': The story directly addresses or heavily overlaps with the changes
      * 'moderate': The story has some relevance but isn't central to the changes
      * 'low': The story has minimal or tangential relevance
    - Provide clear reasoning for why each story is impacted
    - If no stories are impacted, return an empty stories array
    - The text field should explain what happened in the change and summarize the story impacts
  `
}

function buildPrompt(target: DiffEvaluationTarget): string {
  if (target.type === 'commit') {
    return dedent`
      Evaluate this commit: ${target.commitSha}

      # Instructions
      1. Use terminalCommand to get the commit details and see what changed
      2. Use searchStories to find user stories that might be impacted by these changes
      3. For each story found, read the story file if needed to understand it better
      4. Assess the scope overlap for each impacted story (significant/moderate/low)
      5. Return a structured response with:
         - A text explanation of what happened in the commit
         - An array of impacted stories with filePath, scopeOverlap, and reasoning

      Focus on finding stories that are actually impacted by the code changes, not just related topics.
    `
  }

  if (target.type === 'staged') {
    return dedent`
      Evaluate the currently staged changes (git index).

      # Instructions
      1. Use terminalCommand to inspect what is staged (e.g., with git diff --cached)
      2. Use searchStories to find user stories that might be impacted by these staged changes
      3. For each story found, read the story file if needed to understand it better
      4. Assess the scope overlap for each impacted story (significant/moderate/low)
      5. Return a structured response with:
         - A text explanation of what is happening in the staged changes
         - An array of impacted stories with filePath, scopeOverlap, and reasoning

      Focus on finding stories that are actually impacted by the code changes, not just related topics.
    `
  }

  return dedent`
    Evaluate unstaged changes (working directory changes and untracked files).

    # Instructions
    1. Use terminalCommand to inspect unstaged changes (e.g., with git diff for modified files, git ls-files --others for untracked files)
    2. Use searchStories to find user stories that might be impacted by these unstaged changes
    3. For each story found, read the story file if needed to understand it better
    4. Assess the scope overlap for each impacted story (significant/moderate/low)
    5. Return a structured response with:
       - A text explanation of what is happening in the unstaged changes
       - An array of impacted stories with filePath, scopeOverlap, and reasoning

    Focus on finding stories that are actually impacted by the code changes, not just related topics.
  `
}

export async function evaluateDiff({
  target,
  searchStoriesTool,
  options: {
    maxSteps = 10,
    model = agents.discovery.options.model,
    logger,
  } = {},
}: DiffEvaluatorOptions): Promise<DiffEvaluatorOutput> {
  const agent = new Agent({
    model,
    system: buildSystemInstructions(target),
    tools: {
      terminalCommand: createLocalTerminalCommandTool(logger),
      readFile: createLocalReadFileTool(logger),
      searchStories: searchStoriesTool,
    },
    onStepFinish: (step) => {
      if (step.reasoningText && step.reasoningText !== '[REDACTED]') {
        logger?.(step.reasoningText)
      }
    },
    stopWhen: stepCountIs(maxSteps),
    experimental_output: Output.object({
      schema: diffEvaluatorOutputSchema,
    }),
  })

  const prompt = buildPrompt(target)

  const result = await agent.generate({ prompt })

  return result.experimental_output
}
