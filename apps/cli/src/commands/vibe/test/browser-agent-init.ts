import { findGitRoot } from '@app/shell'
import { type LanguageModel } from 'ai'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'

import {
  type BrowserTestAgent,
  createBrowserTestAgent,
} from '../../../agents/test-browser'
import { init } from '../../../helpers/init'

type InitializeAgentOptions = {
  headless?: boolean
  instructions?: string
  onProgress: (message: string) => void
  onBrowserClosed: () => void
}

type InitializeAgentSuccess = {
  success: true
  agent: BrowserTestAgent
  model: LanguageModel
  gitRoot: string
  initialResponse: string
}

type InitializeAgentError = {
  success: false
  error: string
  hint?: string
}

type InitializeAgentResult = InitializeAgentSuccess | InitializeAgentError

/**
 * Initializes the browser test agent with all required dependencies.
 *
 * This function handles:
 * 1. Environment initialization (fs, model, git root)
 * 2. Instructions file validation
 * 3. Browser agent creation
 * 4. Initial navigation run
 *
 * @returns Success result with agent and context, or error result with message
 */
export async function initializeAgent(
  options: InitializeAgentOptions,
): Promise<InitializeAgentResult> {
  const {
    headless,
    instructions: customInstructions,
    onProgress,
    onBrowserClosed,
  } = options

  // Initialize environment
  const { fs, model } = await init()
  const gitRoot = await findGitRoot()

  // Use custom instructions if provided, otherwise read from file
  let instructions: string
  if (customInstructions) {
    instructions = customInstructions
    onProgress('Applying custom instructions')
  } else {
    // Validate instructions file exists
    if (!existsSync(fs.instructions)) {
      return {
        success: false,
        error: `No instructions file found at ${fs.instructions}`,
        hint: 'Create a .kyoto/instructions.md file with testing instructions or use --instructions flag',
      }
    }

    // Read instructions
    instructions = await readFile(fs.instructions, 'utf-8')
    onProgress('Applying .kyoto/instructions.md')
  }

  // Create agent
  const agent = await createBrowserTestAgent({
    model,
    instructions,
    browserStatePath: fs.browserState,
    headless,
    onProgress,
    onBrowserClosed,
  })

  // Run initial navigation
  const result = await agent.run(
    'Navigate to the URL specified in the instructions and stop. Report that you are ready and waiting for further instructions.',
  )

  return {
    success: true,
    agent,
    model,
    gitRoot,
    initialResponse: result.response,
  }
}
