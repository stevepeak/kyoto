import { tool } from 'ai'
import chalk from 'chalk'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { type Ora } from 'ora'
import { z } from 'zod'

import { findGitRoot } from '../git/find-git-root.js'

const createDirectoryInputSchema = z.object({
  path: z
    .string()
    .min(1)
    .max(4_096)
    .describe(
      'Absolute or relative path to the directory. If relative, it will be resolved from the git repository root.',
    ),
})

export async function createLocalDirectory(path: string): Promise<void> {
  const gitRoot = await findGitRoot()
  const absPath = resolve(gitRoot, path)

  try {
    await mkdir(absPath, { recursive: true })
  } catch (error) {
    const message = `Failed to create directory: ${path}`
    // eslint-disable-next-line no-console
    console.error(chalk.red(`📁 ${message}`), { error })
    throw new Error(message)
  }
}

export function createLocalCreateDirectoryTool(ora?: Ora) {
  return tool({
    name: 'createDirectory',
    description:
      'Create a directory on the local filesystem. Creates parent directories as needed (recursive).',
    inputSchema: createDirectoryInputSchema,
    execute: async (input: z.infer<typeof createDirectoryInputSchema>) => {
      // Update ora to show directory being created
      if (ora) {
        ora.text = chalk.hex('#f1dab4')(`Creating directory: ${input.path}`)
      }
      await createLocalDirectory(input.path)
      // Reset ora text after creating
      if (ora) {
        ora.text = ''
      }
      return `Successfully created directory: ${input.path}`
    },
  })
}
