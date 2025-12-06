import { tool } from 'ai'
import { z } from 'zod'
import { rename, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import chalk from 'chalk'
import type { Ora } from 'ora'
import { findGitRoot } from '../helpers/find-kyoto-dir.js'

const moveFileInputSchema = z.object({
  from: z
    .string()
    .min(1)
    .max(4_096)
    .describe(
      'Absolute or relative path to the source file. If relative, it will be resolved from the git repository root.',
    ),
  to: z
    .string()
    .min(1)
    .max(4_096)
    .describe(
      'Absolute or relative path to the destination file. If relative, it will be resolved from the git repository root.',
    ),
})

export async function moveLocalFile(
  from: string,
  to: string,
): Promise<void> {
  const gitRoot = await findGitRoot()
  const absFromPath = resolve(gitRoot, from)
  const absToPath = resolve(gitRoot, to)
  const dir = dirname(absToPath)

  try {
    // Ensure destination directory exists
    await mkdir(dir, { recursive: true })
    await rename(absFromPath, absToPath)
  } catch (error) {
    const message = `Failed to move file from ${from} to ${to}`
    console.error(chalk.red(`📦 ${message}`), { error })
    throw new Error(message)
  }
}

export function createLocalMoveFileTool(ora?: Ora) {
  return tool({
    name: 'moveFile',
    description:
      'Move a file from one location to another on the local filesystem. Creates destination directories as needed.',
    inputSchema: moveFileInputSchema,
    execute: async (input) => {
      // Update ora to show file being moved
      if (ora) {
        ora.text = chalk.hex('#f1dab4')(`Moving: ${input.from} → ${input.to}`)
      }
      await moveLocalFile(input.from, input.to)
      // Reset ora text after moving
      if (ora) {
        ora.text = ''
      }
      return `Successfully moved file from ${input.from} to ${input.to}`
    },
  })
}

