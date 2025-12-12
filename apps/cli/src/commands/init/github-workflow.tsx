import { findGitRoot } from '@app/shell'
import { Box, Text } from 'ink'
import Spinner from 'ink-spinner'
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

type Step = 'checking' | 'setting-up' | 'done'

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
  const { logs, logger } = useCliLogger()

  useEffect(() => {
    if (state === 'active' && step === 'checking') {
      setStep('setting-up')
    }
  }, [state, step])

  const finishWorkflow = useCallback(async (): Promise<void> => {
    setStep('done')
    onComplete()
  }, [onComplete])

  // Check if GitHub workflow is already configured on mount (best-effort)
  useEffect(() => {
    const checkIfConfigured = async (): Promise<void> => {
      try {
        const gitRoot = await findGitRoot()
        const workflowFile = join(gitRoot, '.github', 'workflows', 'kyoto.yml')

        try {
          await readFile(workflowFile, 'utf-8')
          setIsAlreadyConfigured(true)
        } catch {
          // File doesn't exist
        }
      } catch {
        // Ignore errors during initial check
      }
    }

    void checkIfConfigured()
  }, [])

  useEffect(() => {
    if (state !== 'active' || step !== 'setting-up') {
      return
    }

    const ensureWorkflow = async (): Promise<void> => {
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
          // Create it
        }

        await mkdir(githubDir, { recursive: true })
        await writeFile(workflowFile, WORKFLOW_CONTENT, 'utf-8')

        logger(
          <Text>
            <Text color="green">✓</Text> Wrote{' '}
            <Text color="cyan">.github/workflows/kyoto.yml</Text>
          </Text>,
        )

        await finishWorkflow()
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

    void ensureWorkflow()
  }, [finishWorkflow, logger, onComplete, state, step])

  if (state === 'completed' || isAlreadyConfigured) {
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
        <Box flexDirection="column" marginTop={1}>
          <Text color="grey">
            Kyoto will run in GitHub Actions for future pull requests and
            commits.
          </Text>
          <Text color="grey">Next:</Text>
          <Text>
            <Text dimColor>$ </Text>
            <Text color="yellow">
              kyoto commit &quot;kyoto github workflow&quot;
            </Text>
          </Text>
        </Box>
        {logs.map((line) => {
          return <React.Fragment key={line.key}>{line.content}</React.Fragment>
        })}
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      {step === 'checking' || step === 'setting-up' ? (
        <Box flexDirection="column">
          <Text>
            <Text color="red">
              <Spinner type="dots" />
            </Text>{' '}
            Setup GitHub Actions workflow
          </Text>
          <Text color="grey">
            {step === 'setting-up'
              ? 'Creating .github/workflows/kyoto.yml...'
              : 'Checking for existing workflow...'}
          </Text>
        </Box>
      ) : null}

      {logs.map((line) => {
        return <React.Fragment key={line.key}>{line.content}</React.Fragment>
      })}
    </Box>
  )
}
