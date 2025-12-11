import { findGitRoot } from '@app/shell'
import { Box, Text } from 'ink'
import Spinner from 'ink-spinner'
import TextInput from 'ink-text-input'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import React, { useCallback, useEffect, useState } from 'react'
import { dedent } from 'ts-dedent'

import { useCliLogger } from '../../helpers/logging/logger'

const WORKFLOW_CONTENT = dedent`
  name: Kyoto

  on:
    push:
      branches:
        - main
    pull_request:

  jobs:
    test:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with:
            node-version: '22'
        - name: Run Kyoto vibe check
          run: npx kyoto vibe check
`

type Step = 'checking' | 'prompt' | 'done'

type ComponentState = 'pending' | 'active' | 'completed'

interface GitHubWorkflowProps {
  state: ComponentState
  onComplete: () => void
}

export function GitHubWorkflow({
  state,
  onComplete,
}: GitHubWorkflowProps): React.ReactElement {
  const [step, setStep] = useState<Step>('checking')
  const [isAlreadyConfigured, setIsAlreadyConfigured] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isSkipped, setIsSkipped] = useState(false)
  const { logs, logger } = useCliLogger()

  const finishWorkflow = useCallback(async (): Promise<void> => {
    setStep('done')
    onComplete()
  }, [onComplete])

  // Check if GitHub workflow is already configured on mount
  useEffect(() => {
    const checkIfConfigured = async (): Promise<void> => {
      try {
        const gitRoot = await findGitRoot()
        const workflowFile = join(gitRoot, '.github', 'workflows', 'kyoto.yml')

        try {
          await readFile(workflowFile, 'utf-8')
          setIsAlreadyConfigured(true)
          if (state === 'pending') {
            // If we're still pending but already configured, complete immediately
            onComplete()
          }
        } catch {
          // File doesn't exist
        }
      } catch {
        // Ignore errors during initial check
      }
    }

    void checkIfConfigured()
  }, [onComplete, state])

  useEffect(() => {
    if (state !== 'active' || step !== 'checking' || isAlreadyConfigured) {
      return
    }

    const checkGithubWorkflow = async (): Promise<void> => {
      try {
        const gitRoot = await findGitRoot()
        const githubDir = join(gitRoot, '.github', 'workflows')
        const workflowFile = join(githubDir, 'kyoto.yml')

        try {
          await readFile(workflowFile, 'utf-8')
          logger(
            <Text color="grey">
              {
                '\n✓ GitHub Actions workflow already exists at .github/workflows/kyoto.yml\n'
              }
            </Text>,
          )
          await finishWorkflow()
          return
        } catch {
          setStep('prompt')
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to check GitHub workflow setup'
        if (
          message.includes('git') ||
          message.includes('Git repository') ||
          message.includes('not a git repository')
        ) {
          logger(<Text color="#c27a52">{`\n⚠️  ${message}\n`}</Text>)
        }
        setStep('done')
        onComplete()
      }
    }

    void checkGithubWorkflow()
  }, [finishWorkflow, logger, onComplete, state, step, isAlreadyConfigured])

  const createWorkflow = async (): Promise<void> => {
    try {
      const gitRoot = await findGitRoot()
      const githubDir = join(gitRoot, '.github', 'workflows')
      const workflowFile = join(githubDir, 'kyoto.yml')

      await mkdir(githubDir, { recursive: true })
      await writeFile(workflowFile, WORKFLOW_CONTENT, 'utf-8')

      await finishWorkflow()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to setup GitHub workflow'
      if (
        message.includes('git') ||
        message.includes('Git repository') ||
        message.includes('not a git repository')
      ) {
        logger(<Text color="#c27a52">{`\n⚠️  ${message}\n`}</Text>)
      }
      setStep('done')
      onComplete()
    }
  }

  if (state === 'completed' || isAlreadyConfigured) {
    if (isSkipped) {
      return (
        <Box flexDirection="column">
          <Text>
            <Text color="yellow">-</Text> GitHub Actions{' '}
            <Text color="grey">skipped</Text>
          </Text>
          {logs.map((line) => {
            return (
              <React.Fragment key={line.key}>{line.content}</React.Fragment>
            )
          })}
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        <Text>
          <Text color="green">✓</Text> GitHub Actions
        </Text>
        <Text color="grey">
          {'  '}
          <Text>- </Text>
          <Text>.github/workflows/kyoto.yml</Text>
        </Text>
        {logs.map((line) => {
          return <React.Fragment key={line.key}>{line.content}</React.Fragment>
        })}
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      {step === 'prompt' ? (
        <Box flexDirection="row" gap={1} alignItems="center">
          <Text>
            <Text color="red">
              <Spinner type="dots" />
            </Text>{' '}
            Setup GitHub Actions workflow <Text color="grey">(Y/n)</Text>
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
                void createWorkflow()
              } else if (normalized === 'n' || normalized === 'no') {
                setIsSkipped(true)
                void finishWorkflow()
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
