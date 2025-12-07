import { type Sandbox } from '@daytonaio/sdk'
import { streams } from '@trigger.dev/sdk'
import { tool } from 'ai'
import { z } from 'zod'

const terminalCommandInputSchema = z.object({
  command: z
    .string()
    .min(1)
    .max(8_000)
    .describe(
      'The non-interactive shell command to run inside the VM sandbox.',
    ),
})

export function createTerminalCommandTool(ctx: { sandbox: Sandbox }) {
  return tool({
    name: 'terminalCommand',
    description:
      'Execute shell commands (e.g. rg, fd, tree, sed, grep, git, find, etc.) within the repository workspace.',
    inputSchema: terminalCommandInputSchema,
    execute: async (input) => {
      void streams.append('progress', `Executing command ${input.command}`)
      const result = await ctx.sandbox.process.executeCommand(
        input.command,
        `workspace/repo`,
      )

      const output = result.result ?? ''

      if (result.exitCode !== 0) {
        return JSON.stringify({
          exitCode: result.exitCode,
          output,
        })
      }

      return output
    },
  })
}
