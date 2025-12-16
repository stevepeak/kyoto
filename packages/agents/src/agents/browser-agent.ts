import {
  createActTool,
  createAgentTool,
  createExtractTool,
  createGotoTool,
  createObserveTool,
} from '@app/browserbase'
import { Experimental_Agent as Agent, Output, stepCountIs } from 'ai'
import { dedent } from 'ts-dedent'
import { z } from 'zod'

import { type AnalyzeBrowserAgentOptions } from './browser-agent.types'

export const browserAgentOutputSchema = z.object({
  observations: z.array(
    z.object({
      action: z.string().describe('The action that was performed'),
      result: z.string().describe('The result of the action'),
      timestamp: z.string().describe('When the action was performed'),
    }),
  ),
  summary: z.string().describe('A summary of what was accomplished'),
  success: z.boolean().describe('Whether the overall task was successful'),
})

export type BrowserAgentOutput = z.infer<typeof browserAgentOutputSchema>

const SYSTEM_PROMPT = dedent`
  You are a browser automation agent that executes user-provided instructions to interact with web pages.
  Your goal is to follow the instructions carefully, using the available browser tools to navigate,
  interact with, and extract information from web pages.

  # Tools Available
  - **goto**: Navigate to a specific URL
  - **act**: Perform actions on the page (click, type, scroll, etc.)
  - **extract**: Extract structured data from the page
  - **observe**: Discover actionable elements on the page
  - **agent**: Execute complex multi-step browser workflows autonomously

  # Guidelines
  1. Always start by navigating to the appropriate URL if one is provided in the instructions
  2. Use the observe tool to understand what elements are available before acting
  3. Use the act tool for individual actions like clicking buttons, filling forms, etc.
  4. Use the extract tool to gather structured data from the page
  5. Use the agent tool for complex multi-step workflows
  6. Keep track of what you do and report observations

  # Important
  - Follow the user's instructions precisely
  - If an action fails, try alternative approaches
  - Report all observations and results in the output
  - Be explicit about what succeeded and what failed
`

/**
 * Browser agent that executes user instructions to interact with web pages.
 * Uses Browserbase/Stagehand tools for browser automation.
 */
export async function runBrowserAgent(
  options: AnalyzeBrowserAgentOptions,
): Promise<BrowserAgentOutput> {
  const {
    instructions,
    browserContext,
    model,
    maxSteps = 50,
    telemetryTracer,
    onProgress,
  } = options

  // Create browser tools with the provided context
  const tools = {
    goto: createGotoTool(browserContext),
    act: createActTool(browserContext),
    extract: createExtractTool(browserContext),
    observe: createObserveTool(browserContext),
    agent: createAgentTool(browserContext),
  }

  const agent = new Agent({
    model,
    system: SYSTEM_PROMPT,
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'browser-agent',
      tracer: telemetryTracer,
    },
    tools,
    stopWhen: stepCountIs(maxSteps),
    onStepFinish: (step) => {
      if (step.reasoningText && step.reasoningText !== '[REDACTED]') {
        onProgress?.(step.reasoningText)
      }
    },
    experimental_output: Output.object({
      schema: browserAgentOutputSchema,
    }),
  })

  const prompt = dedent`
    Execute the following browser automation instructions:

    ${instructions}

    After completing the tasks, provide a structured response with:
    - observations: A list of actions performed and their results
    - summary: A brief summary of what was accomplished
    - success: Whether the overall task was successful
  `

  const result = await agent.generate({ prompt })

  return result.experimental_output
}
