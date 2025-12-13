import { findGitRoot, getScopeContext } from '@app/shell'
import {
  type VibeCheckAgent,
  type VibeCheckContext,
  type VibeCheckResult,
} from '@app/types'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { defaultVibeCheckAgents } from '../../agents'
import { CLI_VERSION } from '../../generated/version'
import { getConfig } from '../../helpers/config/get'
import { constructModel } from '../../helpers/config/get-model'

/**
 * MCP Server implementation for Kyoto code review tools.
 * This server exposes code review agents as MCP tools that can be called by AI agents.
 */
async function runMcpServer(): Promise<void> {
  const server = new McpServer(
    {
      name: 'Kyoto',
      version: CLI_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  )

  // Helper function to create VibeCheckContext
  // Errors are caught and returned as proper MCP error responses
  async function createContext(): Promise<VibeCheckContext> {
    try {
      const gitRoot = await findGitRoot()
      const config = await getConfig()
      const { model } = constructModel(config)
      const scope = { type: 'unstaged' as const }

      // Retrieve scope content programmatically before agents start
      const scopeContent = await getScopeContext(scope, gitRoot)

      return {
        gitRoot,
        scope,
        scopeContent,
        model,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to create context: ${message}`)
    }
  }

  // Helper function to run an agent and return result
  async function runAgent(
    agent: VibeCheckAgent,
    context: VibeCheckContext,
  ): Promise<VibeCheckResult> {
    const reporter = {
      progress: (_message: string) => {
        // Progress updates are logged internally by agents
        // In MCP mode, we return complete results, so progress is not needed
      },
    }

    return await agent.run(context, reporter)
  }

  // Register code_review tool (runs all review agents)
  server.registerTool(
    'code_review',
    {
      description: 'Run all code review agents on unstaged changes',
    },
    async () => {
      const context = await createContext()

      // Run all review agents in parallel
      const results = await Promise.all(
        defaultVibeCheckAgents.map((agent) => runAgent(agent, context)),
      )

      // Combine results
      const allFindings = results.flatMap((r) => r.findings || [])
      const errorCount = allFindings.filter(
        (f) => f.severity === 'error',
      ).length
      const warnCount = allFindings.filter((f) => f.severity === 'warn').length
      const infoCount = allFindings.filter((f) => f.severity === 'info').length

      // Determine overall status
      let status: 'pass' | 'warn' | 'fail' = 'pass'
      if (errorCount > 0) {
        status = 'fail'
      } else if (warnCount > 0) {
        status = 'warn'
      }

      // Create summary
      const summaryParts: string[] = []
      if (errorCount > 0) {
        summaryParts.push(
          `${errorCount} critical issue${errorCount === 1 ? '' : 's'}`,
        )
      }
      if (warnCount > 0) {
        summaryParts.push(`${warnCount} warning${warnCount === 1 ? '' : 's'}`)
      }
      if (infoCount > 0) {
        summaryParts.push(`${infoCount} note${infoCount === 1 ? '' : 's'}`)
      }
      const summary =
        summaryParts.length > 0 ? summaryParts.join(', ') : 'No issues found'

      const combinedResult: VibeCheckResult = {
        status,
        summary,
        findings: allFindings,
      }

      return {
        content: [
          {
            type: 'text',
            text: combinedResult.summary,
          },
        ],
        structuredContent: combinedResult as unknown as Record<string, unknown>,
      }
    },
  )

  // Register individual agent tools
  for (const agent of defaultVibeCheckAgents) {
    server.registerTool(
      agent.id,
      {
        description: agent.description || agent.label,
      },
      async () => {
        try {
          const context = await createContext()
          const result = await runAgent(agent, context)
          return {
            content: [
              {
                type: 'text',
                text: result.summary,
              },
            ],
            structuredContent: result as unknown as Record<string, unknown>,
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error)
          const errorResult: VibeCheckResult = {
            status: 'fail',
            summary: `Error: ${errorMessage}`,
            findings: [],
          }
          return {
            content: [
              {
                type: 'text',
                text: errorResult.summary,
              },
            ],
            structuredContent: errorResult as unknown as Record<
              string,
              unknown
            >,
            isError: true,
          }
        }
      },
    )
  }

  // Connect transport and start server
  // This must happen before any tool execution to establish the JSON-RPC protocol
  const transport = new StdioServerTransport()
  await server.connect(transport)

  // Keep the process alive
  // The server will handle requests until the process is terminated
  // All errors are now handled through the MCP protocol
}

/**
 * Main entry point for MCP command.
 * Detects if running in MCP mode (stdio) or interactive mode (TTY).
 */
export async function runMcpCommand(): Promise<void> {
  await runMcpServer()
}

// Default export for React component (not used in MCP mode, but kept for compatibility)
export default function Mcp(): never {
  throw new Error(
    'MCP command should be run via runMcpCommand(), not as a React component',
  )
}
