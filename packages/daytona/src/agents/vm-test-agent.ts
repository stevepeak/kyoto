import { type StoryTestOutput, storyTestOutputSchema } from '@app/schemas'
import { type Sandbox } from '@daytonaio/sdk'
import { type Tracer } from '@opentelemetry/api'
import {
  Experimental_Agent as Agent,
  type LanguageModel,
  Output,
  stepCountIs,
} from 'ai'
import { dedent } from 'ts-dedent'

import {
  type AsciicastRecording,
  createRecordedPtySession,
  type RecordedPtySession,
} from '../helpers/pty-session'
import { createReadFileTool } from '../tools/read-file-tool'
import { createTerminalCommandTool } from '../tools/terminal-command-tool'

const SYSTEM_PROMPT = dedent`
  You are a test execution agent running inside a VM sandbox. Your job is to execute
  the user's test instructions by running terminal commands.

  # Your Environment
  - You are in a Linux VM with a full development environment
  - You have access to the terminal to run any commands
  - You can read files from the filesystem
  - All your terminal commands are being recorded for playback

  # Guidelines
  1. Follow the test instructions carefully and precisely
  2. Run commands one at a time and observe the output
  3. If a command fails, report the failure and stop unless instructed otherwise
  4. Be explicit about what you're doing and why
  5. Report your observations and findings

  # Available Tools
  - **terminalCommand**: Execute shell commands in the recorded terminal session
  - **readFile**: Read files from the repository workspace

  # Output Format
  After completing the test, provide a structured summary of:
  - What commands were executed
  - What was observed
  - Whether the test passed or failed
  - Any issues or unexpected behaviors found
`

export type VmTestAgentConfig = {
  /** The AI model to use */
  model: LanguageModel
  /** The Daytona sandbox instance */
  sandbox: Sandbox
  /** The test instructions to execute */
  instructions: string
  /** Maximum number of agent steps (default: 50) */
  maxSteps?: number
  /** Optional telemetry tracer */
  telemetryTracer?: Tracer
  /** Callback for progress updates */
  onProgress?: (message: string) => void
  /** Callback for terminal output */
  onTerminalOutput?: (text: string) => void
}

export type VmTestAgentResult = {
  /** The agent's structured observations */
  observations: StoryTestOutput
  /** The asciicast recording of the terminal session */
  recording: AsciicastRecording
  /** Whether the test was successful */
  success: boolean
}

/**
 * VM test agent that executes test instructions in a Daytona sandbox.
 * Uses a recorded PTY session so all terminal commands are captured
 * in asciicast format for playback.
 */
export async function runVmTestAgent(
  config: VmTestAgentConfig,
): Promise<VmTestAgentResult> {
  const {
    model,
    sandbox,
    instructions,
    maxSteps = 50,
    telemetryTracer,
    onProgress,
    onTerminalOutput,
  } = config

  const sessionId = `kyoto-test-${Date.now()}`

  // Create a recorded PTY session
  let ptySession: RecordedPtySession | null = null

  try {
    onProgress?.('Creating recorded PTY session...')

    ptySession = await createRecordedPtySession({
      sandbox,
      sessionId,
      cols: 120,
      rows: 40,
      onOutput: onTerminalOutput,
    })

    onProgress?.('PTY session created, starting agent...')

    // Create tools that use the PTY session
    const tools = {
      terminalCommand: createTerminalCommandTool({
        sandbox,
        ptyHandle: ptySession.ptyHandle,
        waitForPtyOutput: ptySession.waitForOutput,
      }),
      readFile: createReadFileTool({ sandbox }),
    }

    // Create the agent
    const agent = new Agent({
      model,
      system: SYSTEM_PROMPT,
      experimental_telemetry: {
        isEnabled: true,
        functionId: 'vm-test-agent',
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

    // Build the prompt
    const prompt = dedent`
      Please execute the following test instructions in the VM:

      <TestInstructions>
      ${instructions}
      </TestInstructions>

      Execute each step carefully and report your findings.

      After running the test, provide a structured response with:
      - observations: A list of actions performed and their results (each with action, result, and timestamp)
      - summary: A brief summary of what was accomplished
      - success: Whether the overall task was successful
    `

    // Run the agent
    const result = await agent.generate({ prompt })

    // Parse the structured output
    const observations = storyTestOutputSchema.parse(result.experimental_output)

    // Get the recording
    const recording = ptySession.getRecording()

    return {
      observations,
      recording,
      success: observations.success,
    }
  } finally {
    // Clean up the PTY session
    if (ptySession) {
      await ptySession.close()
    }
  }
}
