import { Text } from 'ink'
import React, { useEffect, useState } from 'react'

import { type LogEntry } from '../../types/logger'
import { useCliLogger } from '../logging/logger'
import {
  checkMcpConfiguration,
  commitMcpChanges,
  configureMcpJson,
  createKyotoMdcFile,
} from './mcp-setup'

type Step = 'checking' | 'setting-up' | 'commit-prompt' | 'committing' | 'done'
type ComponentState = 'pending' | 'active' | 'completed'

export interface UseMcpSetupOptions {
  state: ComponentState
  onComplete: () => void
}

export interface UseMcpSetupReturn {
  step: Step
  configuredFiles: string[]
  commitPromptValue: string
  setCommitPromptValue: (value: string) => void
  commitError: string | null
  handleCommitSubmit: (value: string) => void
  logs: LogEntry[]
}

/**
 * Custom hook that manages MCP setup state and effects.
 * Handles checking configuration, setting up files, and committing changes.
 */
export function useMcpSetup({
  state,
  onComplete,
}: UseMcpSetupOptions): UseMcpSetupReturn {
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
      const status = await checkMcpConfiguration()
      setConfiguredFiles(status.configuredFiles)
      setStep('setting-up')
    }

    void checkIfConfigured()
  }, [state, step])

  // Setup MCP files when state becomes active and step is setting-up
  useEffect(() => {
    if (state !== 'active' || step !== 'setting-up') {
      return
    }

    const setupMCP = async (): Promise<void> => {
      try {
        // Create kyoto.mdc file
        const mdcCreated = await createKyotoMdcFile()
        if (mdcCreated) {
          setConfiguredFiles((prev) => {
            if (!prev.includes('.cursor/rules/kyoto.mdc')) {
              return [...prev, '.cursor/rules/kyoto.mdc']
            }
            return prev
          })
        } else {
          logger(<Text color="#c27a52">⚠️ Failed to create kyoto.mdc</Text>)
        }

        // Configure mcp.json
        const mcpConfigured = await configureMcpJson()
        if (mcpConfigured) {
          setConfiguredFiles((prev) => {
            if (!prev.includes('.cursor/mcp.json')) {
              return [...prev, '.cursor/mcp.json']
            }
            return prev
          })
        } else {
          logger(
            <Text color="#c27a52">⚠️ Failed to create/update mcp.json</Text>,
          )
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
  }, [logger, state, step])

  // Commit changes when step is committing
  useEffect(() => {
    if (state !== 'active' || step !== 'committing') {
      return
    }

    const commit = async (): Promise<void> => {
      const result = await commitMcpChanges()

      if (result.success) {
        logger(
          <Text>
            <Text color="green">✓</Text> Committed MCP configuration
          </Text>,
        )
      } else {
        setCommitError(result.error)
        logger(<Text color="#c27a52">{`⚠️  ${result.error}`}</Text>)
      }

      setStep('done')
      setTimeout(() => onComplete(), 750)
    }

    void commit()
  }, [logger, onComplete, state, step])

  const handleCommitPromptChange = (value: string): void => {
    setCommitPromptValue(value)
    setCommitError(null)
  }

  const handleCommitSubmit = (value: string): void => {
    const normalized = value.trim().toLowerCase()
    if (normalized === '' || normalized === 'y' || normalized === 'yes') {
      setStep('committing')
    } else if (normalized === 'n' || normalized === 'no') {
      setStep('done')
      setTimeout(() => onComplete(), 750)
    } else {
      setCommitError('Please enter y or n (or press Enter for yes).')
    }
  }

  return {
    step,
    configuredFiles,
    commitPromptValue,
    setCommitPromptValue: handleCommitPromptChange,
    commitError,
    handleCommitSubmit,
    logs,
  }
}
