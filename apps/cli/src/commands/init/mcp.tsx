import { findGitRoot } from '@app/shell'
import { Box, Text } from 'ink'
import Spinner from 'ink-spinner'
import TextInput from 'ink-text-input'
import { execFile } from 'node:child_process'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'
import React, { useEffect, useState } from 'react'
import { dedent } from 'ts-dedent'
import { z } from 'zod'

import { useCliLogger } from '../../helpers/logging/logger'

type Step = 'checking' | 'setting-up' | 'commit-prompt' | 'committing' | 'done'
type ComponentState = 'pending' | 'active' | 'completed'

interface MCPProps {
  state: ComponentState
  onComplete: () => void
}

const mcpJsonSchema = z
  .object({
    mcpServers: z.record(z.unknown()).optional(),
  })
  .passthrough()

const execFileAsync = promisify(execFile)

async function runGit(args: {
  gitRoot: string
  gitArgs: string[]
}): Promise<{ stdout: string; stderr: string }> {
  const res = await execFileAsync('git', args.gitArgs, { cwd: args.gitRoot })
  return {
    stdout: String(res.stdout ?? ''),
    stderr: String(res.stderr ?? ''),
  }
}

export function MCP({ state, onComplete }: MCPProps): React.ReactElement {
  const [step, setStep] = useState<Step>('checking')
  const [configuredFiles, setConfiguredFiles] = useState<string[]>([])
  const [commitPromptValue, setCommitPromptValue] = useState('')
  const [commitError, setCommitError] = useState<string | null>(null)
  const { logs, logger } = useCliLogger()

  // Check if MCP is already configured when state becomes active
  useEffect(() => {
    if (state !== 'active' || step !== 'checking') {
      return
    }

    const checkIfConfigured = async (): Promise<void> => {
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
          const parsed = mcpJsonSchema.safeParse(
            JSON.parse(mcpContent) as unknown,
          )
          const mcpConfig = parsed.success ? parsed.data : null
          const mcpServers = mcpConfig?.mcpServers
          if (mcpServers?.kyoto) {
            files.push('.cursor/mcp.json')
          }
        } catch {
          // File doesn't exist or invalid
        }

        setConfiguredFiles(files)
        setStep('setting-up')
      } catch {
        // On error, still attempt setup
        setStep('setting-up')
      }
    }

    void checkIfConfigured()
  }, [state, step, onComplete])

  useEffect(() => {
    if (state !== 'active' || step !== 'setting-up') {
      return
    }

    const setupMCP = async (): Promise<void> => {
      try {
        const gitRoot = await findGitRoot()

        // Create .cursor/rules directory and kyoto.mdc file
        try {
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

          setConfiguredFiles((prev) => {
            if (!prev.includes('.cursor/rules/kyoto.mdc')) {
              return [...prev, '.cursor/rules/kyoto.mdc']
            }
            return prev
          })
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Failed to create kyoto.mdc'
          logger(<Text color="#c27a52">{`⚠️  ${message}`}</Text>)
        }

        // Check for .cursor/mcp.json and append Kyoto service configuration
        try {
          const cursorDir = join(gitRoot, '.cursor')
          const mcpJsonPath = join(cursorDir, 'mcp.json')

          let mcpConfig: z.infer<typeof mcpJsonSchema> = {}

          try {
            const mcpContent = await readFile(mcpJsonPath, 'utf-8')
            const parsed = mcpJsonSchema.safeParse(
              JSON.parse(mcpContent) as unknown,
            )
            mcpConfig = parsed.success ? parsed.data : {}
          } catch {
            // File doesn't exist, we'll create it
            await mkdir(cursorDir, { recursive: true })
          }

          // Append services configuration
          if (!mcpConfig.services) {
            mcpConfig.services = {}
          }

          const services = mcpConfig.services

          if (!services.kyoto) {
            services.kyoto = {
              command: 'kyoto',
              args: ['mcp'],
            }

            await writeFile(
              mcpJsonPath,
              JSON.stringify(mcpConfig, null, 2) + '\n',
              'utf-8',
            )

            setConfiguredFiles((prev) => {
              if (!prev.includes('.cursor/mcp.json')) {
                return [...prev, '.cursor/mcp.json']
              }
              return prev
            })
          } else {
            setConfiguredFiles((prev) => {
              if (!prev.includes('.cursor/mcp.json')) {
                return [...prev, '.cursor/mcp.json']
              }
              return prev
            })
          }
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : 'Failed to create/update mcp.json'
          logger(<Text color="#c27a52">{`⚠️  ${message}`}</Text>)
        }

        setStep('commit-prompt')
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to setup MCP'
        logger(<Text color="#c27a52">{`\n⚠️  ${message}\n`}</Text>)
        setStep('commit-prompt')
      }
    }

    void setupMCP()
  }, [logger, onComplete, state, step])

  useEffect(() => {
    if (state !== 'active' || step !== 'committing') {
      return
    }

    const commit = async (): Promise<void> => {
      try {
        const gitRoot = await findGitRoot()

        await runGit({
          gitRoot,
          gitArgs: ['add', '.cursor/mcp.json', '.cursor/rules/kyoto.mdc'],
        })

        await runGit({
          gitRoot,
          gitArgs: ['commit', '-m', 'chore: configure kyoto mcp'],
        })

        logger(
          <Text>
            <Text color="green">✓</Text> Committed MCP configuration
          </Text>,
        )
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to commit changes'

        // Common case if files were already committed or unchanged
        if (message.toLowerCase().includes('nothing to commit')) {
          logger(<Text color="grey">No changes to commit.</Text>)
        } else {
          setCommitError(message)
          logger(<Text color="#c27a52">{`⚠️  ${message}`}</Text>)
        }
      } finally {
        setStep('done')
        setTimeout(() => onComplete(), 750)
      }
    }

    void commit()
  }, [logger, onComplete, state, step])

  if (step === 'commit-prompt' || step === 'committing' || step === 'done') {
    const filesToShow =
      configuredFiles.length > 0
        ? configuredFiles
        : ['.cursor/mcp.json', '.cursor/rules/kyoto.mdc']

    return (
      <Box flexDirection="column">
        <Text>
          <Text color="green">✓</Text> MCP
        </Text>
        {filesToShow.map((file) => (
          <Text color="grey" key={file}>
            {'  '}
            <Text>- </Text>
            <Text>{file}</Text>
          </Text>
        ))}
        <Box flexDirection="column" marginTop={1}>
          {step === 'committing' ? (
            <Text color="grey">
              <Text color="red">
                <Spinner type="dots" />
              </Text>{' '}
              Committing changes...
            </Text>
          ) : step === 'commit-prompt' ? (
            <Box flexDirection="column">
              <Text>
                Commit these changes now? <Text color="grey">(Y/n)</Text>
                <TextInput
                  value={commitPromptValue}
                  onChange={(v) => {
                    setCommitPromptValue(v)
                    setCommitError(null)
                  }}
                  onSubmit={(value) => {
                    const normalized = value.trim().toLowerCase()
                    if (
                      normalized === '' ||
                      normalized === 'y' ||
                      normalized === 'yes'
                    ) {
                      setStep('committing')
                    } else if (normalized === 'n' || normalized === 'no') {
                      setStep('done')
                      setTimeout(() => onComplete(), 750)
                    } else {
                      setCommitError(
                        'Please enter y or n (or press Enter for yes).',
                      )
                    }
                  }}
                />
              </Text>
              {commitError ? <Text color="#c27a52">{commitError}</Text> : null}
            </Box>
          ) : (
            <Text color="grey">Done.</Text>
          )}
        </Box>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box flexDirection="column">
        <Text>
          <Text color="red">
            <Spinner type="dots" />
          </Text>{' '}
          Setup Kyoto MCP
        </Text>
        <Text color="grey">
          Creating <Text color="cyan">.cursor/rules/kyoto.mdc</Text> and
          updating <Text color="cyan">.cursor/mcp.json</Text>...
        </Text>
      </Box>

      {logs.map((line) => {
        return <React.Fragment key={line.key}>{line.content}</React.Fragment>
      })}
    </Box>
  )
}
