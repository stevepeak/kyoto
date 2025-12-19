import { performBrowserTests } from '@app/agents'
import { findGitRoot, getScopeContext } from '@app/shell'
import {
  type VibeCheckAgent,
  type VibeCheckContext,
  type VibeCheckResult,
  type VibeCheckScope,
} from '@app/types'
import { pluralize } from '@app/utils'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { resolve } from 'node:path'

import { defaultVibeCheckAgents } from '../../agents'
import { CLI_VERSION } from '../../generated/version'
import { getConfig } from '../../helpers/config/get'
import { constructModel } from '../../helpers/config/get-model'
import { parseChangesFlag } from '../../helpers/parse-changes-flag'
import { initializeAgent } from '../vibe/test/browser-agent-init'

/**
 * MCP Server implementation for Kyoto code review tools.
 * This server exposes code review agents as MCP tools that can be called by AI agents.
 */
async function runMcpServer(args: { cwd?: string }): Promise<void> {
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
  async function createContext(
    changes?: { file: string; lines: string }[],
  ): Promise<VibeCheckContext> {
    try {
      // Use provided cwd or find git root
      const gitRoot = args.cwd ? resolve(args.cwd) : await findGitRoot()
      const config = await getConfig()
      const { model } = constructModel(config)

      // Determine scope based on changes parameter
      const scope =
        changes && changes.length > 0
          ? { type: 'file-lines' as const, changes }
          : { type: 'unstaged' as const }

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
    'code-review',
    {
      description:
        'Run all code review agents on unstaged changes. Optionally specify specific file and line ranges using the changes parameter.',
      inputSchema: {
        type: 'object',
        properties: {
          changes: {
            type: 'string',
            description:
              'Optional. Check specific file and line ranges in format "file1.ts:1-10,file2.ts:20-30". If not provided, checks all unstaged changes.',
            examples: ['src/file.ts:1-10'],
          },
        },
      } as any, // JSON Schema format - valid at runtime
    },
    async (args: { changes?: string } = {}) => {
      const parsedChanges = args?.changes
        ? parseChangesFlag(args.changes)
        : undefined
      const context = await createContext(parsedChanges ?? undefined)

      // Run all review agents in parallel
      const results = await Promise.all(
        defaultVibeCheckAgents.map((agent) => runAgent(agent, context)),
      )

      // Combine results
      const allFindings = results.flatMap((r) => r.findings || [])
      const errorCount = allFindings.filter(
        (f) => f.severity === 'error',
      ).length
      const bugCount = allFindings.filter((f) => f.severity === 'bug').length
      const highCount = allFindings.filter((f) => f.severity === 'high').length
      const warnCount = allFindings.filter((f) => f.severity === 'warn').length
      const infoCount = allFindings.filter((f) => f.severity === 'info').length

      // Determine overall status
      let status: 'pass' | 'warn' | 'fail' = 'pass'
      if (errorCount > 0 || bugCount > 0 || highCount > 0) {
        status = 'fail'
      } else if (warnCount > 0) {
        status = 'warn'
      }

      // Create summary
      const summaryParts: string[] = []
      if (errorCount > 0) {
        summaryParts.push(
          `${errorCount} critical ${pluralize(errorCount, 'issue')}`,
        )
      }
      if (warnCount > 0) {
        summaryParts.push(`${warnCount} ${pluralize(warnCount, 'warning')}`)
      }
      if (infoCount > 0) {
        summaryParts.push(`${infoCount} ${pluralize(infoCount, 'note')}`)
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
            type: 'text' as const,
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
        description: `${agent.description || agent.label}. Optionally specify specific file and line ranges using the changes parameter.`,
        inputSchema: {
          type: 'object',
          properties: {
            changes: {
              type: 'string',
              description:
                'Optional. Check specific file and line ranges in format "file1.ts:1-10,file2.ts:20-30". If not provided, checks all unstaged changes.',
              examples: ['src/file.ts:1-10'],
            },
          },
        } as any, // JSON Schema format - valid at runtime
      },
      async (args: { changes?: string } = {}) => {
        try {
          const parsedChanges = args?.changes
            ? parseChangesFlag(args.changes)
            : undefined
          const context = await createContext(parsedChanges ?? undefined)
          const result = await runAgent(agent, context)
          return {
            content: [
              {
                type: 'text' as const,
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
                type: 'text' as const,
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

  // Register browser-test tool
  server.registerTool(
    'browser-test',
    {
      description:
        'Run browser tests on code changes using an AI agent. Analyzes changes, generates test suggestions, and executes them automatically.',
      inputSchema: {
        type: 'object',
        properties: {
          changes: {
            type: 'string',
            description:
              'Required. File and line ranges to test in format "file1.ts:1-10,file2.ts:20-30".',
            examples: ['src/file.ts:1-10'],
          },
          headless: {
            type: 'boolean',
            description:
              'Run browser in headless mode (default: false). When false, browser window is visible.',
            default: false,
          },
          instructions: {
            type: 'string',
            description:
              'Optional. Custom instructions for the browser test agent. If not provided, uses .kyoto/instructions.md file.',
          },
        },
        required: ['changes'],
      } as any, // JSON Schema format - valid at runtime
    },
    async (args: {
      changes: string
      headless?: boolean
      instructions?: string
    }) => {
      try {
        // Parse changes
        const parsedChanges = parseChangesFlag(args.changes)
        if (!parsedChanges || parsedChanges.length === 0) {
          throw new Error(
            'Invalid changes format. Expected "file:lines" format.',
          )
        }

        // Initialize browser agent
        const initResult = await initializeAgent({
          headless: args.headless ?? false,
          instructions: args.instructions,
          onProgress: () => {
            // Progress is logged internally, not needed for MCP
          },
          onBrowserClosed: () => {
            // Browser closed callback - not critical for MCP
          },
        })

        if (!initResult.success) {
          throw new Error(initResult.error)
        }

        const { agent, model: agentModel, gitRoot: agentGitRoot } = initResult

        try {
          // Get scope context
          const scope: VibeCheckScope = {
            type: 'file-lines',
            changes: parsedChanges,
          }
          const scopeContent = await getScopeContext(scope, agentGitRoot)

          // Perform browser tests
          const testResult = await performBrowserTests({
            agent,
            context: {
              gitRoot: agentGitRoot,
              scope,
              scopeContent,
              model: agentModel,
            },
            parsedChanges,
            progress: () => {
              // Progress is logged internally
            },
          })

          // Handle case where no tests were suggested
          if (testResult.status === 'info' && testResult.tests.length === 0) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: testResult.summary,
                },
              ],
              structuredContent: {
                status: testResult.status,
                summary: testResult.summary,
                tests: [],
                results: [],
              },
            }
          }

          // Format results text
          const resultsText = testResult.results
            .map((result, i) => {
              const statusIcon = result.passed ? '✅' : '❌'
              return `${statusIcon} Test ${i + 1}: ${result.description}\n${result.response}\n`
            })
            .join('\n---\n\n')

          return {
            content: [
              {
                type: 'text' as const,
                text: `${testResult.summary}\n\n${resultsText}`,
              },
            ],
            structuredContent: {
              status: testResult.status,
              summary: testResult.summary,
              tests: testResult.tests,
              results: testResult.results,
            },
          }
        } finally {
          // Ensure browser is closed even on error
          await agent.close()
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        return {
          content: [
            {
              type: 'text' as const,
              text: `Browser test error: ${errorMessage}`,
            },
          ],
          structuredContent: {
            status: 'fail',
            summary: `Error: ${errorMessage}`,
            tests: [],
            results: [],
          },
          isError: true,
        }
      }
    },
  )

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
export async function runMcpCommand(
  args: { cwd?: string } = {},
): Promise<void> {
  await runMcpServer(args)
}

// Default export for React component (not used in MCP mode, but kept for compatibility)
export default function Mcp(): never {
  throw new Error(
    'MCP command should be run via runMcpCommand(), not as a React component',
  )
}
