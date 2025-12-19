import { findGitRoot, runGit } from '@app/shell'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { dedent } from 'ts-dedent'
import { z } from 'zod'

const mcpJsonSchema = z
  .object({
    mcpServers: z.record(z.unknown()).optional(),
  })
  .passthrough()

type McpConfig = z.infer<typeof mcpJsonSchema>

interface McpConfigurationStatus {
  configuredFiles: string[]
}

/**
 * Checks if MCP is already configured by looking for:
 * - .cursor/rules/kyoto.mdc file
 * - Kyoto service in .cursor/mcp.json
 */
export async function checkMcpConfiguration(): Promise<McpConfigurationStatus> {
  try {
    const gitRoot = await findGitRoot()
    const files: string[] = []

    // Check if kyoto.mdc exists
    try {
      const cursorRulesPath = join(gitRoot, '.cursor', 'rules')
      const kyotoMdcPath = join(cursorRulesPath, 'kyoto.mdc')
      await stat(kyotoMdcPath)
      files.push('.cursor/rules/kyoto.mdc')
    } catch {
      // File doesn't exist
    }

    // Check if mcp.json has kyoto service
    try {
      const mcpJsonPath = join(gitRoot, '.cursor', 'mcp.json')
      const mcpContent = await readFile(mcpJsonPath, 'utf-8')
      const parsed = mcpJsonSchema.safeParse(JSON.parse(mcpContent) as unknown)
      const mcpConfig = parsed.success ? parsed.data : null
      const mcpServers = mcpConfig?.mcpServers
      if (mcpServers?.kyoto) {
        files.push('.cursor/mcp.json')
      }
    } catch {
      // File doesn't exist or invalid
    }

    return { configuredFiles: files }
  } catch {
    // On error, return empty configuration
    return { configuredFiles: [] }
  }
}

/**
 * Creates the .cursor/rules/kyoto.mdc file with Kyoto MCP rules.
 */
export async function createKyotoMdcFile(): Promise<boolean> {
  try {
    const gitRoot = await findGitRoot()
    const cursorRulesPath = join(gitRoot, '.cursor', 'rules')
    await mkdir(cursorRulesPath, { recursive: true })

    const kyotoMdcPath = join(cursorRulesPath, 'kyoto.mdc')
    const kyotoMdcContent = dedent`
      ---
      description: Kyoto MCP rules for vibe checking AI code
      alwaysApply: true
      ---

      Use the Kyoto MCP tool once your work is complete to ensure it aligns with best coding practices.
    `
    await writeFile(kyotoMdcPath, kyotoMdcContent, 'utf-8')
    return true
  } catch {
    return false
  }
}

/**
 * Configures .cursor/mcp.json to include the Kyoto MCP service.
 * Creates the file if it doesn't exist, or appends the service if it does.
 */
export async function configureMcpJson(): Promise<boolean> {
  try {
    const gitRoot = await findGitRoot()
    const cursorDir = join(gitRoot, '.cursor')
    const mcpJsonPath = join(cursorDir, 'mcp.json')

    let mcpConfig: McpConfig = {}

    try {
      const mcpContent = await readFile(mcpJsonPath, 'utf-8')
      const parsed = mcpJsonSchema.safeParse(JSON.parse(mcpContent) as unknown)
      mcpConfig = parsed.success ? parsed.data : {}
    } catch {
      // File doesn't exist, we'll create it
      await mkdir(cursorDir, { recursive: true })
    }

    // Append services configuration
    if (!mcpConfig.mcpServers) {
      mcpConfig.mcpServers = {}
    }

    const mcpServers = mcpConfig.mcpServers

    if (!mcpServers.Kyoto) {
      mcpServers.Kyoto = {
        command: 'kyoto',
        // eslint-disable-next-line no-template-curly-in-string
        args: ['mcp', '--cwd', '${workspaceFolder}'],
      }

      await writeFile(
        mcpJsonPath,
        JSON.stringify(mcpConfig, null, 2) + '\n',
        'utf-8',
      )
    }

    return true
  } catch {
    return false
  }
}

/**
 * Commits the MCP configuration files to git.
 */
export async function commitMcpChanges(): Promise<
  { success: true } | { success: false; error: string }
> {
  try {
    const gitRoot = await findGitRoot()

    await runGit({
      gitRoot,
      args: ['add', '.cursor/mcp.json', '.cursor/rules/kyoto.mdc'],
    })

    await runGit({
      gitRoot,
      args: ['commit', '-m', 'chore: configure kyoto mcp'],
    })

    return { success: true }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to commit changes'

    // Common case if files were already committed or unchanged
    if (message.toLowerCase().includes('nothing to commit')) {
      return { success: true } // Treat as success
    }

    return { success: false, error: message }
  }
}
