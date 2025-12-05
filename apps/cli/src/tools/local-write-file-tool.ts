import { tool } from 'ai'
import { z } from 'zod'
import { writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import chalk from 'chalk'
import type { Ora } from 'ora'

const writeFileInputSchema = z.object({
  path: z
    .string()
    .min(1)
    .max(4_096)
    .describe(
      'Absolute or relative path to the file. If relative, it will be resolved from the current working directory.',
    ),
  content: z.string().describe('The content to write to the file.'),
})

export async function writeLocalFile(
  path: string,
  content: string,
): Promise<void> {
  const absFilePath = resolve(process.cwd(), path)
  const dir = dirname(absFilePath)

  try {
    // Ensure directory exists
    await mkdir(dir, { recursive: true })
    await writeFile(absFilePath, content, 'utf-8')
  } catch (error) {
    const message = `Failed to write file: ${path}`
    console.error(chalk.red(`📝 ${message}`), { error })
    throw new Error(message)
  }
}

export function createLocalWriteFileTool(ora?: Ora) {
  return tool({
    name: 'writeFile',
    description:
      'Write content to a file on the local filesystem. Creates directories as needed.',
    inputSchema: writeFileInputSchema,
    execute: async (input) => {
      // Update ora to show file being written
      if (ora) {
        ora.text = chalk.hex('#f1dab4')(`Writing: ${input.path}`)
      }
      await writeLocalFile(input.path, input.content)
      // Reset ora text after writing
      if (ora) {
        ora.text = ''
      }
      return `Successfully wrote file: ${input.path}`
    },
  })
}
