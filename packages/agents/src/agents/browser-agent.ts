import {
  createActTool,
  createAgentTool,
  createExtractTool,
  createGotoTool,
  createObserveTool,
} from '@app/browserbase'
import { type StoryTestOutput, storyTestOutputSchema } from '@app/schemas'
import { Experimental_Agent as Agent, Output, stepCountIs } from 'ai'
import { dedent } from 'ts-dedent'

import { type AnalyzeBrowserAgentOptions } from './browser-agent.types'

// Re-export for backwards compatibility
export { storyTestOutputSchema as browserAgentOutputSchema }

const SYSTEM_PROMPT = dedent`
  You are a quality assurance engineer that tests the product according to the user's instructions.
  Your goal is to follow the instructions carefully, using the available browser tools 
  to test the product according to the user's test provided.

  # Tools Available
  - **goto**: Navigate to a specific URL
  - **act**: Perform actions on the page (click, type, scroll, etc.)
  - **extract**: Extract structured data from the page
  - **observe**: Discover actionable elements on the page
  - **agent**: Execute complex multi-step browser workflows autonomously

  # Important
  - Follow the user's instructions precisely
  - If an action fails, do not try alternative approaches
  - Report all observations and results in the output
  - Be explicit about what succeeded and what failed
`

/**
 * Browser agent that executes user instructions to interact with web pages.
 * Uses Browserbase/Stagehand tools for browser automation.
 */
export async function runBrowserAgent(
  options: AnalyzeBrowserAgentOptions,
): Promise<StoryTestOutput> {
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
      schema: storyTestOutputSchema,
    }),
  })

  const prompt = dedent`
    Please test our website for the following user stories:

    <Test>
    ${instructions}
    </Test>

    After running the test, provide a structured response with:
    - observations: A list of actions performed and their results
    - summary: A brief summary of what was accomplished
    - success: Whether the overall task was successful
  `

  const result = await agent.generate({ prompt })

  return storyTestOutputSchema.parse(result.experimental_output)
}
