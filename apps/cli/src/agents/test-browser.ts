import {
  closeBrowser,
  createPlaywrightTools,
  launchBrowser,
  type PlaywrightContext,
} from '@app/playwright'
import {
  createLocalReadFileTool,
  createLocalTerminalCommandTool,
} from '@app/shell'
import {
  Experimental_Agent as Agent,
  type CoreMessage,
  type LanguageModel,
  stepCountIs,
} from 'ai'
import { dedent } from 'ts-dedent'

type BrowserTestAgentConfig = {
  /** The language model to use */
  model: LanguageModel
  /** Instructions from .kyoto/instructions.md */
  instructions: string
  /** Path to browser state file for persisting login sessions */
  browserStatePath?: string
  /** Run browser in headless mode (default: false) */
  headless?: boolean
  /** Progress callback for logging */
  onProgress?: (message: string) => void
  /** Called when the browser is closed by the user */
  onBrowserClosed?: () => void
}

type BrowserTestAgentResult = {
  /** The agent's response text */
  response: string
  /** Updated message history for continuation */
  messages: CoreMessage[]
}

type ResetContextArgs = {
  /** List of files that were modified */
  changedFiles: string[]
  /** Test plan from the analyzer agent */
  testPlan: { description: string; steps: string[] }[]
}

/**
 * Creates a browser test agent that can be used interactively.
 * Supports continuation by maintaining message history.
 */
export async function createBrowserTestAgent(config: BrowserTestAgentConfig) {
  const {
    model,
    instructions,
    browserStatePath,
    headless,
    onProgress,
    onBrowserClosed,
  } = config

  // Launch the browser with storage state if available
  onProgress?.('Launching browser')
  const browserContext = await launchBrowser({
    storageStatePath: browserStatePath,
    headless,
  })

  // Register callback for when browser is closed by user
  if (onBrowserClosed) {
    browserContext.onDisconnected(onBrowserClosed)
  }

  // Create tools
  const playwrightTools = createPlaywrightTools({
    ctx: browserContext,
    onProgress,
  })

  const tools = {
    ...playwrightTools,
    terminalCommand: createLocalTerminalCommandTool(onProgress),
    readFile: createLocalReadFileTool(onProgress),
  }

  const systemPrompt = buildSystemPrompt(instructions)

  // Message history for continuation
  const messages: CoreMessage[] = []

  /**
   * Run the agent with a prompt, optionally continuing from previous messages.
   */
  async function run(prompt: string): Promise<BrowserTestAgentResult> {
    // Add user message
    messages.push({ role: 'user', content: prompt })

    onProgress?.('Thinking...')

    const agent = new Agent({
      model,
      system: systemPrompt,
      tools,
      stopWhen: stepCountIs(50),
      onStepFinish: (step) => {
        if (step.reasoningText && step.reasoningText !== '[REDACTED]') {
          onProgress?.(step.reasoningText)
        }
      },
    })

    const result = await agent.generate({
      messages,
    })

    // Get the response text
    const responseText = result.text ?? ''

    // Add assistant response to history
    messages.push({ role: 'assistant', content: responseText })

    // Save browser state after each run (preserves login sessions)
    if (browserStatePath) {
      try {
        await browserContext.context.storageState({ path: browserStatePath })
      } catch {
        // Ignore errors if browser was closed
      }
    }

    return {
      response: responseText,
      messages,
    }
  }

  /**
   * Reset the message context for a new test batch.
   * Clears history and seeds with context about changed files and test plan.
   */
  function resetContext(args: ResetContextArgs): void {
    const { changedFiles, testPlan } = args

    // Clear existing messages
    messages.length = 0

    // Seed with context about this test batch
    const contextMessage = dedent`
      ## Test Context

      ### Changed Files
      ${changedFiles.map((f) => `- ${f}`).join('\n')}

      ### Test Plan
      ${testPlan.map((t, i) => `${i + 1}. **${t.description}**\n   Steps: ${t.steps.join(' → ')}`).join('\n\n')}

      You will now receive individual test prompts. Execute each test and report pass/fail.
    `

    messages.push({ role: 'user', content: contextMessage })
    messages.push({
      role: 'assistant',
      content:
        'Understood. I have the context about the changed files and test plan. Ready to execute tests.',
    })
  }

  /**
   * Close the browser and clean up.
   */
  async function close(): Promise<void> {
    await closeBrowser(browserContext)
  }

  /**
   * Get the current browser context for external use.
   */
  function getBrowserContext(): PlaywrightContext {
    return browserContext
  }

  return {
    run,
    resetContext,
    close,
    getBrowserContext,
  }
}

function buildSystemPrompt(instructions: string): string {
  return dedent`
    You are a browser testing agent. Your job is to test user behaviors and features in a web application.

    ## Instructions from User
    ${instructions}

    ## Available Tools

    ### Browser Tools
    - **goto**: Navigate to a URL
    - **click**: Click elements using CSS selectors, text, or role selectors
    - **type**: Type text into input fields
    - **screenshot**: Take screenshots of the page or elements
    - **observe**: Get the current page state and text content
    - **waitFor**: Wait for elements to appear or disappear
    - **getText**: Get text content from elements
    - **pressKey**: Press keyboard keys

    ### Development Tools
    - **terminalCommand**: Run shell commands (e.g., grep, find, git)
    - **readFile**: Read files from the codebase

    ## Behavior Guidelines

    1. **On first run**: Navigate to the URL specified in instructions and stop. Report that you're ready and waiting for further instructions.

    2. **On continuation**: Follow the user's instructions to test specific features or behaviors.

    3. **Testing approach**:
       - Use observe to understand the current page state
       - Interact with elements using click, type, pressKey
       - Verify results by checking page content
       - Take screenshots when useful to document findings

    4. **Reporting**: After testing, clearly report:
       - What you tested
       - What worked correctly
       - Any issues or unexpected behaviors found
       - Suggestions for additional testing if applicable

    ## Response Format

    **IMPORTANT**: Always format your responses in Markdown. Your output will be rendered using a Markdown renderer.

    Keep responses concise and actionable. Structure your findings clearly using Markdown formatting:

    ## Test Results

    ### Tested
    Brief description of what was tested

    ### Result
    ✅ **Pass** or ❌ **Fail** with details

    ### Issues
    - Any problems found (if applicable)
    - Use bullet points for multiple issues

    ### Notes
    Additional observations

    Use appropriate Markdown features:
    - **Bold** for emphasis
    - \`code\` for selectors, elements, or technical terms
    - Bullet points for lists
    - Headers for sections
  `
}

export type BrowserTestAgent = Awaited<
  ReturnType<typeof createBrowserTestAgent>
>
