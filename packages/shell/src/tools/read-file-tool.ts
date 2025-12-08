import { type Tool, tool } from 'ai'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'

import { findGitRoot } from '../git/find-git-root'

const readFileInputSchema = z.object({
  path: z
    .string()
    .min(1)
    .max(4_096)
    .describe(
      'Absolute or relative path to the file. If relative, it will be resolved from the git repository root.',
    ),
})

export async function readLocalFile(path: string): Promise<string> {
  const gitRoot = await findGitRoot()
  const absFilePath = resolve(gitRoot, path)
  const content = await readFile(absFilePath, 'utf-8')
  return content
}

export function createLocalReadFileTool(
  logger?: (message: string) => void,
): Tool {
  return tool({
    name: 'readFile',
    description:
      'Read and return the entire contents of a file from the local filesystem.',
    inputSchema: readFileInputSchema,
    execute: async (input) => {
      if (logger) {
        logger(`Reading file (${input.path})`)
      }
      const content = await readLocalFile(input.path)
      return content
    },
  })
}
