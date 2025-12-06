import { tool } from 'ai'
import { z } from 'zod'
import { writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import chalk from 'chalk'
import { findGitRoot } from '../helpers/find-git-root.js'

const writeFileInputSchema = z.object({
  path: z
    .string()
    .min(1)
    .max(4_096)
    .describe(
      'Absolute or relative path to the file. If relative, it will be resolved from the git repository root.',
    ),
  content: z.string().describe('The content to write to the file.'),
})

export async function writeLocalFile(
  path: string,
  content: string,
): Promise<void> {
  const gitRoot = await findGitRoot()
  const absFilePath = resolve(gitRoot, path)
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

export function createLocalWriteFileTool(args: { schema: z.ZodAny }) {
  return tool({
    name: 'writeFile',
    description:
      'Write content to a file on the local filesystem. Creates directories as needed.',
    inputSchema: args.schema
      ? writeFileInputSchema
          .extend({ content: args.schema })
          .transform((data) => ({
            path: data.path,
            content: JSON.stringify(data.content, null, 2),
          }))
      : writeFileInputSchema,
    execute: async (input) => {
      // Update ora to show file being written
      await writeLocalFile(input.path, input.content)
      // Reset ora text after writing
      return `Successfully wrote file: ${input.path}`
    },
  })
}
