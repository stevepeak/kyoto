import { findGitRoot, getGitHubInfo } from '@app/shell'
import { execa } from 'execa'
import { Box, Text } from 'ink'
import Spinner from 'ink-spinner'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import React, { useCallback, useEffect, useState } from 'react'
import { dedent } from 'ts-dedent'

import { getConfig } from '../../helpers/config/get'
import { Link } from '../../ui/link'

const createWorkflowContent = (): string => {
  return dedent`
    name: Kyoto

    on:
      push:
        branches:
          - main
      pull_request:

    jobs:
      kyoto:
        runs-on: ubuntu-latest
        permissions:
          checks: write
          contents: read
        env:
          KYOTO_AI_TOKEN: \${{ secrets.KYOTO_AI_TOKEN }}
        steps:
          - uses: actions/checkout@v4
          - uses: actions/setup-node@v4
            with:
              node-version: '22'
          - run: npx @usekyoto/cli vibe check
  `
}

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
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [isFileTracked, setIsFileTracked] = useState<boolean>(false)
  const [fileFound, setFileFound] = useState<boolean>(false)
  const [fileCreated, setFileCreated] = useState<boolean>(false)
  const [secretsUrl, setSecretsUrl] = useState<string | null>(null)

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
        // Load API key for display
        try {
          const config = await getConfig()
          const configApiKey = config.user.openrouterApiKey || config.ai.apiKey
          setApiKey(configApiKey)
        } catch {
          // Config might not exist, that's okay
        }

        const gitRoot = await findGitRoot()
        const workflowFile = join(gitRoot, '.github', 'workflows', 'kyoto.yml')

        // Get GitHub info for secrets URL
        try {
          const githubInfo = await getGitHubInfo(gitRoot)
          const url = githubInfo
            ? `https://github.com/${githubInfo.owner}/${githubInfo.repo}/settings/secrets/actions/new`
            : null
          setSecretsUrl(url)
        } catch {
          // Ignore errors getting GitHub info
        }

        try {
          await readFile(workflowFile, 'utf-8')
          setFileFound(true)
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
        // Read config to get the API key for instructions
        let configApiKey: string | null = null
        try {
          const config = await getConfig()
          configApiKey = config.user.openrouterApiKey || config.ai.apiKey
          setApiKey(configApiKey)
        } catch {
          // Config might not exist, that's okay - we'll still create the workflow
        }

        const gitRoot = await findGitRoot()
        const githubInfo = await getGitHubInfo(gitRoot)
        const githubDir = join(gitRoot, '.github', 'workflows')
        const workflowFile = join(githubDir, 'kyoto.yml')

        // Construct the secrets URL
        const url = githubInfo
          ? `https://github.com/${githubInfo.owner}/${githubInfo.repo}/settings/secrets/actions/new`
          : null
        setSecretsUrl(url)

        try {
          await readFile(workflowFile, 'utf-8')
          // File exists - check if tracked in git
          setFileFound(true)
          try {
            const relativePath = relative(gitRoot, workflowFile)
            await execa('git', ['ls-files', '--error-unmatch', relativePath], {
              cwd: gitRoot,
            })
            // If command succeeds, file is tracked
            setIsFileTracked(true)
          } catch {
            // File is not tracked
            setIsFileTracked(false)
          }
          await finishWorkflow()
          return
        } catch {
          // File doesn't exist - create it
        }

        await mkdir(githubDir, { recursive: true })
        const workflowContent = createWorkflowContent()
        await writeFile(workflowFile, workflowContent, 'utf-8')
        setFileCreated(true)
        setIsFileTracked(false)

        await finishWorkflow()
      } catch (err) {
        setStep('done')
        onComplete()
      }
    }

    void ensureWorkflow()
  }, [finishWorkflow, onComplete, state, step])

  // Loading state
  if (step === 'checking' || step === 'setting-up') {
    return (
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
    )
  }

  // File found - show reminder
  if (fileFound) {
    return (
      <Box flexDirection="column">
        <Text>
          <Text color="green">✓</Text> GitHub Actions workflow already exists at{' '}
          <Text color="cyan">.github/workflows/kyoto.yml</Text>
        </Text>
        {apiKey ? (
          <Box flexDirection="column" marginTop={1}>
            <Text color="grey">
              Don't forget to add <Text color="cyan">KYOTO_AI_TOKEN</Text> set
              to <Text color="yellow">{apiKey}</Text> on your GitHub repository
              Actions secrets.{' '}
              {secretsUrl && (
                <Text color="cyan">
                  <Link url={secretsUrl}>{secretsUrl}</Link>
                </Text>
              )}
            </Text>
          </Box>
        ) : null}
      </Box>
    )
  }

  // File created - show all steps sequentially
  if (fileCreated && step === 'done') {
    return (
      <Box flexDirection="column">
        {/* 1. Wrote file */}
        <Text>
          <Text color="green">✓</Text> Wrote{' '}
          <Text color="cyan">.github/workflows/kyoto.yml</Text>
        </Text>

        {/* 2. Steps to add token */}
        {apiKey ? (
          <Box flexDirection="column" marginTop={1}>
            <Text color="grey">
              To complete setup, add the following secret to your GitHub
              repository:
            </Text>
            {secretsUrl && (
              <Box flexDirection="column" marginTop={1}>
                <Box flexDirection="row">
                  <Box width={12}>
                    <Text color="grey">1. Go to:</Text>
                  </Box>
                  <Text color="cyan">
                    <Link url={secretsUrl}>{secretsUrl}</Link>
                  </Text>
                </Box>
                <Box flexDirection="row">
                  <Box width={12}>
                    <Text color="grey">2. Name:</Text>
                  </Box>
                  <Text color="cyan">KYOTO_AI_TOKEN</Text>
                </Box>
                <Box flexDirection="row">
                  <Box width={12}>
                    <Text color="grey">3. Secret:</Text>
                  </Box>
                  <Text color="yellow">{apiKey}</Text>
                </Box>
                <Box flexDirection="row">
                  <Box width={12}>
                    <Text color="grey">4. Click:</Text>
                  </Box>
                  <Text color="white">Add secret</Text>
                </Box>
              </Box>
            )}
          </Box>
        ) : (
          <Box marginTop={1}>
            <Text color="grey">
              ⚠️ Could not read API key from config. You'll need to manually add
              the <Text color="cyan">KYOTO_AI_TOKEN</Text> secret to your GitHub
              repository.
            </Text>
          </Box>
        )}

        {/* 3. Next commit changes */}
        {!isFileTracked ? (
          <>
            <Box marginTop={1}>
              <Text color="grey">Next:</Text>
            </Box>
            <Text>
              <Text dimColor>$ </Text>
              <Text color="yellow">
                kyoto commit &quot;kyoto github workflow&quot;
              </Text>
            </Text>
          </>
        ) : null}
      </Box>
    )
  }

  // Default/fallback
  return (
    <Box flexDirection="column">
      <Text>
        <Text color="green">✓</Text> GitHub Actions
      </Text>
    </Box>
  )
}
