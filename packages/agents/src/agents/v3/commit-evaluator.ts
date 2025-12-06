import { Experimental_Agent as Agent, Output, stepCountIs } from 'ai'
import type { LanguageModel } from 'ai'
import { dedent } from 'ts-dedent'

import {
  createLocalTerminalCommandTool,
  createLocalReadFileTool,
} from '@app/shell'
import { agents } from '../../index.js'

interface CommitEvaluatorOptions {
  commitSha: string
  options?: {
    maxSteps?: number
    model?: LanguageModel
    onProgress?: (message: string) => void
  }
}

function buildSystemInstructions(): string {
  return dedent`
    You are an expert code analyst tasked with evaluating a git commit to understand what changes were made and how they might impact user stories.

    # Your Task
    Analyze a git commit by:
    1. Retrieving the commit details using git commands
    2. Understanding what files were changed
    3. Understanding what the changes do
    4. Explaining what happened in the commit in a clear, concise way

    # Tools Available
    - **terminalCommand**: Execute git commands to retrieve commit information
      - Use \`git show <sha>\` to see the commit details and diff
      - Use \`git log -1 --format=<format> <sha>\` to get commit metadata
      - Use \`git diff <sha>^..<sha>\` to see what changed
    - **readFile**: Read files from the repository to understand context

    # Output
    Provide a clear explanation of what happened in this commit. Focus on:
    - What files were changed
    - What the changes do
    - Any notable patterns or implications

    Keep your explanation concise but informative. Write in plain language that helps understand the commit's purpose.
  `
}

function buildPrompt(commitSha: string): string {
  return dedent`
    Evaluate this commit: ${commitSha}

    Use the available tools to retrieve the commit details and explain what happened.
  `
}

export async function evaluateCommit({
  commitSha,
  options: {
    maxSteps = 10,
    model = agents.discovery.options.model,
    onProgress,
  } = {},
}: CommitEvaluatorOptions): Promise<string> {
  const agent = new Agent({
    model,
    system: buildSystemInstructions(),
    tools: {
      terminalCommand: createLocalTerminalCommandTool(onProgress),
      readFile: createLocalReadFileTool(),
    } as any,
    onStepFinish: (step) => {
      if (step.reasoningText) {
        onProgress?.(step.reasoningText)
      }
    },
    stopWhen: stepCountIs(maxSteps),
    experimental_output: Output.text(),
  })

  const prompt = buildPrompt(commitSha)

  const result = await agent.generate({ prompt })

  return result.text
}

