import { tool } from 'ai'
import { z } from 'zod'
import { execa } from 'execa'

const terminalCommandInputSchema = z.object({
  command: z
    .string()
    .min(1)
    .max(8_000)
    .describe('The shell command to run in the current working directory.'),
})

export function createLocalTerminalCommandTool(
  onProgress?: (message: string) => void,
) {
  return tool({
    name: 'terminalCommand',
    description:
      'Execute shell commands (e.g. rg, fd, tree, sed, grep, git, find, etc.) in the current working directory.',
    inputSchema: terminalCommandInputSchema,
    execute: async (input) => {
      if (onProgress) {
        onProgress(input.command)
      }

      try {
        const { stdout, stderr, exitCode } = await execa(input.command, {
          shell: true,
          cwd: process.cwd(),
        })

        if (exitCode !== 0) {
          return JSON.stringify({
            exitCode,
            output: stderr || stdout,
          })
        }

        return stdout || ''
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Command execution failed'
        return JSON.stringify({
          exitCode: 1,
          output: message,
        })
      }
    },
  })
}
