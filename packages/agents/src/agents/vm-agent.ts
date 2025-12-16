import { type Sandbox } from '@daytonaio/sdk'
import { type Tracer } from '@opentelemetry/api'
import { Experimental_Agent as Agent, Output, stepCountIs, tool } from 'ai'
import type { LanguageModel } from 'ai'
import { dedent } from 'ts-dedent'
import { z } from 'zod'

export const vmAgentOutputSchema = z.object({
  observations: z.array(
    z.object({
      command: z.string().describe('The command that was executed'),
      output: z.string().describe('The output of the command'),
      exitCode: z.number().describe('The exit code of the command'),
      timestamp: z.string().describe('When the command was executed'),
    }),
  ),
  summary: z.string().describe('A summary of what was accomplished'),
  success: z.boolean().describe('Whether the overall task was successful'),
})

export type VmAgentOutput = z.infer<typeof vmAgentOutputSchema>

export type AnalyzeVmAgentOptions = {
  /** The instructions describing what the VM agent should do */
  instructions: string
  /** The Daytona sandbox instance */
  sandbox: Sandbox
  /** The AI model to use */
  model: LanguageModel
  /** Maximum number of steps the agent can take (default: 50) */
  maxSteps?: number
  /** Optional telemetry tracer */
  telemetryTracer?: Tracer
  /** Optional progress callback */
  onProgress?: (message: string) => void
}

const SYSTEM_PROMPT = dedent`
  You are a quality assurance engineer that tests software by executing terminal commands.
  Your goal is to follow the instructions carefully, using the available terminal tools 
  to test the product according to the user's test provided.

  # Tools Available
  - **terminalCommand**: Execute any shell command in the VM sandbox

  # Important
  - Follow the user's instructions precisely
  - Execute commands one at a time and observe the results
  - If a command fails, report the failure but continue with remaining instructions if possible
  - Report all observations and results in the output
  - Be explicit about what succeeded and what failed
  - You have full root access to the VM - use it to install packages, modify files, etc.
`

function createVmTerminalTool(args: {
  sandbox: Sandbox
  onProgress?: (message: string) => void
}) {
  const { sandbox, onProgress } = args

  return tool({
    name: 'terminalCommand',
    description:
      'Execute shell commands in the VM sandbox. You have full root access.',
    inputSchema: z.object({
      command: z
        .string()
        .min(1)
        .max(8_000)
        .describe('The shell command to execute'),
    }),
    execute: async (input) => {
      onProgress?.(`Executing: ${input.command}`)

      const result = await sandbox.process.executeCommand(input.command)

      return JSON.stringify({
        exitCode: result.exitCode,
        output: result.result ?? '',
      })
    },
  })
}

/**
 * VM agent that executes user instructions by running terminal commands in a Daytona sandbox.
 * Used for testing CLI tools, scripts, and other terminal-based workflows.
 */
export async function runVmAgent(
  options: AnalyzeVmAgentOptions,
): Promise<VmAgentOutput> {
  const {
    instructions,
    sandbox,
    model,
    maxSteps = 50,
    telemetryTracer,
    onProgress,
  } = options

  const tools = {
    terminalCommand: createVmTerminalTool({ sandbox, onProgress }),
  }

  const agent = new Agent({
    model,
    system: SYSTEM_PROMPT,
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'vm-agent',
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
      schema: vmAgentOutputSchema,
    }),
  })

  const prompt = dedent`
    Please test the following in this VM environment:

    <Test>
    ${instructions}
    </Test>

    After running the test, provide a structured response with:
    - observations: A list of commands executed and their results
    - summary: A brief summary of what was accomplished
    - success: Whether the overall task was successful
  `

  const result = await agent.generate({ prompt })

  return result.experimental_output
}
