import { ToolLoopAgent, Output, stepCountIs } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { Daytona } from '@daytonaio/sdk'
import { z } from 'zod'

import { parseEnv } from '../../helpers/env'
import { createTerminalCommandTool } from '../../tools/terminal-command-tool'
import { createReadFileTool } from '../../tools/read-file-tool'
import {
  createResolveLibraryTool,
  createGetLibraryDocsTool,
} from '../../tools/context7-tool'
import { createLspTool } from '../../tools/lsp-tool'
import { logger } from '@trigger.dev/sdk'

const DEFAULT_STORY_ANALYSIS_MODEL = 'gpt-5-mini'
const DEFAULT_MAX_STEPS = 20
const STORY_ANALYSIS_AGENT_ID = 'story-analysis-v2'

const storyAnalysisOutputSchema = z.object({
  steps: z
    .array(z.string().min(1))
    .describe(
      'A sequential list of concise statements describing the verifiable conditions of the story.',
    ),
})

export type StoryAnalysisAgentOptions = {
  story: string
  repoId: string
  repoName: string
  daytonaSandboxId: string
  maxSteps?: number
  modelId?: string
}

export type StoryAnalysisAgentResult = {
  steps: string[]
  stepCount: number
  toolCallCount: number
}

function buildStoryAnalysisInstructions(repoOutline: string): string {
  return `You are an expert software QA analyst tasked with interpreting a plain-language user story into a clear, verifiable sequence of factual steps.

# Objective
Break down the provided story into concise, objective statements that describe what must be true for the story to be considered valid.
These steps should represent the intended user experience and system behavior — not the internal code implementation.

# Resources Available
You have read-only tools that allow you to:
- Explore the repository structure and files to understand what code exists.
- Inspect function and class names, symbols, and usage patterns.
- Search external library documentation through Context7 to clarify how features may be implemented.
Use these tools only to inform your reasoning — do not include specific identifiers, function names, or file paths in your final output.

# Output Rules
- Produce a sequential list of generic, verifiable steps.
- Each step should be expressed as a plain factual statement that could be reviewed and accepted by a human as evidence of completion.
- Avoid referencing variable names, symbols, or exact implementation details.
- Steps should be ordered logically, representing the flow of the user story.
- Each step should be independently verifiable.

# Example
Input Story:
> When I click the logout button, I am logged out.

Output:
{
  "steps": [
    "A logout button is visible on the user interface.",
    "The user can interact with the logout button.",
    "Performing the logout action removes the active session or authentication token.",
    "Once logged out, the user no longer has access to protected content."
  ]
}

# Repository Overview
Use this output to form an initial understanding of the repository layout, which may help inform how to break down the story into appropriate steps.

${repoOutline}
`
}

function buildStoryAnalysisPrompt(story: string): string {
  return `User Story:
${story}

Analyze this story and break it down into a sequential list of verifiable steps. Each step should be a concise, factual statement describing what must be true for the story to be considered valid.

When your analysis is complete, respond only with the JSON object that matches the schema.`
}

export async function runStoryAnalysisAgent(
  options: StoryAnalysisAgentOptions,
): Promise<StoryAnalysisAgentResult> {
  const env = parseEnv()

  const openAiProvider = createOpenAI({ apiKey: env.OPENAI_API_KEY })
  const effectiveModelId = options.modelId ?? DEFAULT_STORY_ANALYSIS_MODEL

  const daytona = new Daytona({ apiKey: env.DAYTONA_API_KEY })
  const sandbox = await daytona.get(options.daytonaSandboxId)

  // Get repository outline for context
  const repoOutline = await sandbox.process.executeCommand(
    'tree -L 3',
    `workspace/${options.repoName}`,
  )
  const outline =
    repoOutline.exitCode === 0 ? repoOutline.result ?? '' : 'Repository structure unavailable'

  const terminalCommandTool = createTerminalCommandTool({
    sandbox,
    repoName: options.repoName,
  })

  const readFileTool = createReadFileTool({
    sandbox,
    repoName: options.repoName,
  })

  const resolveLibraryTool = createResolveLibraryTool({
    apiKey: env.CONTEXT7_API_KEY,
  })

  const getLibraryDocsTool = createGetLibraryDocsTool({
    apiKey: env.CONTEXT7_API_KEY,
  })

  const lspTool = createLspTool({
    sandbox,
    repoName: options.repoName,
  })

  const maxSteps = Math.max(1, options.maxSteps ?? DEFAULT_MAX_STEPS)

  const agent = new ToolLoopAgent({
    id: STORY_ANALYSIS_AGENT_ID,
    model: openAiProvider(effectiveModelId),
    instructions: buildStoryAnalysisInstructions(outline),
    tools: {
      terminalCommand: terminalCommandTool,
      readFile: readFileTool,
      resolveLibrary: resolveLibraryTool,
      getLibraryDocs: getLibraryDocsTool,
      lsp: lspTool,
    },
    stopWhen: stepCountIs(maxSteps),
    onFinish: (result) => {
      logger.debug('📝 Story Analysis Agent Result', { result })
    },
    output: Output.object({ schema: storyAnalysisOutputSchema }),
  })

  const prompt = buildStoryAnalysisPrompt(options.story)

  const result = await agent.generate({ prompt })

  const parsedOutput = storyAnalysisOutputSchema.parse(result.output)
  const toolCallCount = result.steps.reduce(
    (count, step) => count + step.toolCalls.length,
    0,
  )

  return {
    steps: parsedOutput.steps,
    stepCount: result.steps.length,
    toolCallCount,
  }
}
