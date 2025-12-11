import { findGitRoot } from '@app/shell'
import { Box, Text } from 'ink'
import Spinner from 'ink-spinner'
import TextInput from 'ink-text-input'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import React, { useEffect, useState } from 'react'
import { dedent } from 'ts-dedent'

import { useCliLogger } from '../../helpers/logging/logger'

type Step = 'checking' | 'prompt' | 'setting-up' | 'done'
type ComponentState = 'pending' | 'active' | 'completed'

interface MCPProps {
  state: ComponentState
  onComplete: () => void
}

export function MCP({ state, onComplete }: MCPProps): React.ReactElement {
  const [step, setStep] = useState<Step>('checking')
  const [isAlreadyConfigured, setIsAlreadyConfigured] = useState(false)
  const [configuredFiles, setConfiguredFiles] = useState<string[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isSkipped, setIsSkipped] = useState(false)
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
        let kyotoMdcExists = false
        try {
          const cursorRulesPath = join(gitRoot, '.cursor', 'rules')
          const kyotoMdcPath = join(cursorRulesPath, 'kyoto.mdc')
          await stat(kyotoMdcPath)
          kyotoMdcExists = true
          files.push('.cursor/rules/kyoto.mdc')
        } catch {
          // File doesn't exist
        }

        // Check if mcp.json has kyoto service
        let mcpConfigured = false
        try {
          const mcpJsonPath = join(gitRoot, '.cursor', 'mcp.json')
          const mcpContent = await readFile(mcpJsonPath, 'utf-8')
          const mcpConfig = JSON.parse(mcpContent) as Record<string, unknown>
          const services = mcpConfig.services as
            | Record<string, unknown>
            | undefined
          if (services?.kyoto) {
            mcpConfigured = true
            files.push('.cursor/mcp.json')
          }
        } catch {
          // File doesn't exist or invalid
        }

        // Both must be configured to be considered fully configured
        if (kyotoMdcExists && mcpConfigured) {
          setIsAlreadyConfigured(true)
          setConfiguredFiles(files)
          setStep('done')
          onComplete()
        } else {
          // Not fully configured, move to prompt stage
          setStep('prompt')
        }
      } catch {
        // On error, move to prompt stage
        setStep('prompt')
      }
    }

    void checkIfConfigured()
  }, [state, step, onComplete])

  useEffect(() => {
    if (state !== 'active' || step !== 'setting-up' || isAlreadyConfigured) {
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

          let mcpConfig: Record<string, unknown> = {}

          try {
            const mcpContent = await readFile(mcpJsonPath, 'utf-8')
            mcpConfig = JSON.parse(mcpContent) as Record<string, unknown>
          } catch {
            // File doesn't exist, we'll create it
            await mkdir(cursorDir, { recursive: true })
          }

          // Append services configuration
          if (!mcpConfig.services) {
            mcpConfig.services = {}
          }

          const services = mcpConfig.services as Record<string, unknown>

          if (!services.kyoto) {
            services.kyoto = {
              command: 'npx',
              args: ['kyoyo', 'mcp'],
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
            logger(
              <Text>
                <Text color="green">✓</Text> .cursor/mcp.json already has Kyoto
                service
              </Text>,
            )
          }
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : 'Failed to create/update mcp.json'
          logger(<Text color="#c27a52">{`⚠️  ${message}`}</Text>)
        }

        setStep('done')
        onComplete()
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to setup MCP'
        logger(<Text color="#c27a52">{`\n⚠️  ${message}\n`}</Text>)
        setStep('done')
        onComplete()
      }
    }

    void setupMCP()
  }, [logger, onComplete, state, step, isAlreadyConfigured])

  if (state === 'completed' || isAlreadyConfigured) {
    if (isSkipped) {
      return (
        <Box flexDirection="column">
          <Text>
            <Text color="yellow">-</Text> MCP <Text color="grey">skipped</Text>
          </Text>
          {logs.map((line) => {
            return (
              <React.Fragment key={line.key}>{line.content}</React.Fragment>
            )
          })}
        </Box>
      )
    }

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
        {logs.map((line) => {
          return <React.Fragment key={line.key}>{line.content}</React.Fragment>
        })}
      </Box>
    )
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      {step === 'prompt' ? (
        <Box flexDirection="row" gap={1} alignItems="center">
          <Text>
            <Text color="red">
              <Spinner type="dots" />
            </Text>{' '}
            Setup Kyoto MCP <Text color="grey">(Y/n)</Text>
          </Text>
          <TextInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={(value) => {
              const normalized = value.trim().toLowerCase()
              if (
                normalized === '' ||
                normalized === 'y' ||
                normalized === 'yes'
              ) {
                setStep('setting-up')
              } else if (normalized === 'n' || normalized === 'no') {
                setIsSkipped(true)
                setStep('done')
                onComplete()
              }
            }}
          />
        </Box>
      ) : null}

      {logs.map((line) => {
        return <React.Fragment key={line.key}>{line.content}</React.Fragment>
      })}
    </Box>
  )
}
