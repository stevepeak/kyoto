import { type Tool, tool } from 'ai'
import { execa } from 'execa'
import { z } from 'zod'

const terminalCommandInputSchema = z.object({
  command: z
    .string()
    .min(1)
    .max(8_000)
    .describe('The shell command to run in the current working directory.'),
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createLocalTerminalCommandTool(
  logger?: (message: any) => void,
): Tool {
  return tool({
    name: 'terminalCommand',
    description:
      'Execute shell commands (e.g. rg, fd, tree, sed, grep, git, find, etc.) in the current working directory.',
    inputSchema: terminalCommandInputSchema,
    execute: async (input) => {
      if (logger) {
        logger(`$ ${input.command}`)
      }

      try {
        const { stdout, stderr, exitCode } = await execa(input.command, {
          shell: true,
          cwd: process.cwd(),
          timeout: 30000, // 30 second timeout
        })

        if (exitCode !== 0) {
          return JSON.stringify({
            exitCode,
            output: stderr || stdout,
          })
        }

        return stdout || ''
      } catch (error) {
        let message = 'Command execution failed'
        if (error instanceof Error) {
          // Check if it's a timeout error
          if (
            error.message.includes('timeout') ||
            error.message.includes('Timed out')
          ) {
            message = `Command timed out after 30 seconds: ${input.command}`
          } else {
            message = error.message
          }
        }
        return JSON.stringify({
          exitCode: 1,
          output: message,
        })
      }
    },
  })
}
