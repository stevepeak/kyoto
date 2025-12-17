import { type PtyHandle, type Sandbox } from '@daytonaio/sdk'
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

type TerminalCommandToolContext = {
  sandbox: Sandbox
  /** Optional PTY handle for recording terminal sessions */
  ptyHandle?: PtyHandle
  /** Callback to wait for command output when using PTY */
  waitForPtyOutput?: (marker: string) => Promise<string>
}

export function createTerminalCommandTool(ctx: TerminalCommandToolContext) {
  return tool({
    name: 'terminalCommand',
    description:
      'Execute shell commands (e.g. rg, fd, tree, sed, grep, git, find, etc.) within the repository workspace.',
    inputSchema: terminalCommandInputSchema,
    execute: async (input) => {
      void streams.append('progress', `Executing command ${input.command}`)

      // Use PTY if available (for recording)
      if (ctx.ptyHandle && ctx.waitForPtyOutput) {
        const marker = `__CMD_END_${Date.now()}__`

        // Send command with end marker to detect completion
        await ctx.ptyHandle.sendInput(`${input.command}; echo "${marker}"\n`)

        // Wait for output until we see the marker
        const output = await ctx.waitForPtyOutput(marker)

        return output
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
