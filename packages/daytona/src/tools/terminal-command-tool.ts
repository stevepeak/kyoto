import { type Sandbox } from '@daytonaio/sdk'
import { streams } from '@trigger.dev/sdk'
import { tool } from 'ai'
import { z } from 'zod'

import { type RecordedPtySession } from '../helpers/pty-session'

const terminalCommandInputSchema = z.object({
  command: z
    .string()
    .min(1)
    .max(8_000)
    .describe(
      'The non-interactive shell command to run inside the VM sandbox.',
    ),
})

type TerminalCommandToolContext = {
  sandbox: Sandbox
  /** Optional recorded PTY session for recording terminal sessions */
  session?: RecordedPtySession
}

export function createTerminalCommandTool(ctx: TerminalCommandToolContext) {
  return tool({
    name: 'terminalCommand',
    description:
      'Execute shell commands (e.g. rg, fd, tree, sed, grep, git, find, etc.) within the repository workspace.',
    inputSchema: terminalCommandInputSchema,
    execute: async (input) => {
      void streams.append('progress', `Executing command ${input.command}`)

      // Use recorded PTY session if available (for recording)
      if (ctx.session) {
        return await ctx.session.executeCommand(input.command)
      }

      // Fallback to executeCommand (no recording)
      const result = await ctx.sandbox.process.executeCommand(input.command)

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
