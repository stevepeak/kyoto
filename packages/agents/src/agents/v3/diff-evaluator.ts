import { Experimental_Agent as Agent, Output, stepCountIs } from 'ai'
import type { LanguageModel } from 'ai'
import { dedent } from 'ts-dedent'
import { zodToJsonSchema } from 'zod-to-json-schema'

import {
  createLocalTerminalCommandTool,
  createLocalReadFileTool,
  createSearchStoriesTool,
} from '@app/shell'
import { agents } from '../../index.js'
import {
  diffEvaluatorOutputSchema,
  type DiffEvaluatorOutput,
} from '@app/schemas'

interface DiffEvaluatorOptions {
  commitSha: string
  options?: {
    maxSteps?: number
    model?: LanguageModel
    onProgress?: (message: string) => void
  }
}

function buildSystemInstructions(): string {
  return dedent`
    You are an expert code analyst tasked with evaluating a git commit to determine if any user stories are impacted by the changes.

    # Your Task
    You must determine if any user stories are impacted by this commit by:
    1. Retrieving the commit details using git commands (use terminalCommand)
    2. Understanding what files were changed and what the changes do
    3. Searching for relevant user stories using the searchStories tool
    4. Evaluating which stories are impacted and assessing the scope overlap
    5. Returning a structured response with text explanation and impacted stories

    # Tools Available
    - **terminalCommand**: Execute git commands to retrieve commit information
      - Use \`git show <sha>\` to see the commit details and diff
      - Use \`git show --name-only <sha>\` to see just the changed files
      - Use \`git log -1 --format=<format> <sha>\` to get commit metadata
      - Use \`git diff <sha>^..<sha>\` to see what changed
    - **searchStories**: Search through user stories in .kyoto/stories directory
      - Use keywords from the commit message and changed files to find relevant stories
      - Search for stories related to the functionality being changed
    - **readFile**: Read files from the repository or story files to understand context

    # Output Schema
    You must return a JSON object matching this schema:
    \`\`\`json
    ${JSON.stringify(zodToJsonSchema(diffEvaluatorOutputSchema), null, 2)}
    \`\`\`

    # Important Instructions
    - Analyze the commit changes thoroughly
    - Use searchStories to find stories that might be impacted
    - For each impacted story, assess the scope overlap:
      * 'significant': The story directly addresses or heavily overlaps with the changes
      * 'moderate': The story has some relevance but isn't central to the changes
      * 'low': The story has minimal or tangential relevance
    - Provide clear reasoning for why each story is impacted
    - If no stories are impacted, return an empty stories array
    - The text field should explain what happened in the commit and summarize the story impacts
  `
}

function buildPrompt(commitSha: string): string {
  return dedent`
    Evaluate this commit: ${commitSha}

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

export async function evaluateDiff({
  commitSha,
  options: {
    maxSteps = 10,
    model = agents.discovery.options.model,
    onProgress,
  } = {},
}: DiffEvaluatorOptions): Promise<DiffEvaluatorOutput> {
  const agent = new Agent({
    model,
    system: buildSystemInstructions(),
    tools: {
      terminalCommand: createLocalTerminalCommandTool(onProgress),
      readFile: createLocalReadFileTool(),
      searchStories: createSearchStoriesTool(),
    } as any,
    onStepFinish: (step) => {
      if (step.reasoningText) {
        onProgress?.(step.reasoningText)
      }
    },
    stopWhen: stepCountIs(maxSteps),
    experimental_output: Output.object({
      schema: diffEvaluatorOutputSchema,
    }),
  })

  const prompt = buildPrompt(commitSha)

  const result = await agent.generate({ prompt })

  return result.experimental_output
}
