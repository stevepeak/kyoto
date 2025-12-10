import { findGitRoot, getCurrentBranch, getCurrentCommitSha } from '@app/shell'
import { execa } from 'execa'
import { Box, Text, useApp } from 'ink'
import SelectInput from 'ink-select-input'
import Spinner from 'ink-spinner'
import TextInput from 'ink-text-input'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { pwdKyoto } from '../helpers/config/find-kyoto-dir'
import { getAiConfig } from '../helpers/config/get-ai-config'
import { updateDetailsJson } from '../helpers/config/update-details-json'
import { useCliLogger } from '../helpers/logging/logger'
import { Jumbo } from '../ui/jumbo'

type Provider = 'openai' | 'vercel' | 'openrouter' | 'anthropic'

interface DetailsJson {
  latest?: {
    sha: string
    branch: string
  }
  ai?: {
    provider: Provider
    apiKey: string
    model?: string
  }
}

type Step =
  | 'check-existing'
  | 'confirm-change'
  | 'select-provider'
  | 'api-key'
  | 'saving'
  | 'check-github'
  | 'prompt-github'
  | 'creating-github'
  | 'prompt-git'
  | 'running-git'
  | 'done'

const WORKFLOW_CONTENT = `name: Kyoto

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
      - name: Run Kyoto tests
        run: npx kyoto vibe check
`

function getDefaultModelForProvider(provider: Provider): string {
  switch (provider) {
    case 'openai':
      return 'gpt-5-mini'
    case 'openrouter':
      return 'x-ai/grok-4.1-fast'
    case 'vercel':
      return 'openai/gpt-5-mini'
    case 'anthropic':
      return 'claude-3.5-sonnet'
  }
}

function getReadyMessage(): React.ReactElement {
  return (
    <Text>
      {'\n'}
      <Text color="red">Kyoto is ready to vibe.</Text>
      {'\n\nNext steps:\n  '}
      <Text color="yellow">kyoto vibe</Text>
      {'   - Continuous commit monitoring.\n  '}
      <Text color="yellow">kyoto craft</Text>
      {'  - Create a new user story.\n'}
    </Text>
  )
}

export default function Init(): React.ReactElement {
  const { exit } = useApp()
  const [provider, setProvider] = useState<Provider | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [step, setStep] = useState<Step>('check-existing')
  const { logs, logger } = useCliLogger()
  const [error, setError] = useState<string | null>(null)
  const [existingConfig, setExistingConfig] = useState<{
    provider: Provider
    model?: string
  } | null>(null)
  const [workflowPath, setWorkflowPath] = useState<string | null>(null)

  const finishInit = useCallback(async (): Promise<void> => {
    logger(getReadyMessage())
    setStep('done')
    await new Promise((resolve) => setTimeout(resolve, 1000))
    exit()
  }, [exit, logger])

  const providerLabel = useMemo(() => {
    switch (provider) {
      case 'openai':
        return 'OpenAI'
      case 'vercel':
        return 'Vercel AI Gateway'
      case 'openrouter':
        return 'OpenRouter'
      case 'anthropic':
        return 'Anthropic'
      default:
        return ''
    }
  }, [provider])

  const existingProviderLabel = useMemo(() => {
    if (!existingConfig) return ''
    switch (existingConfig.provider) {
      case 'openai':
        return 'OpenAI'
      case 'vercel':
        return 'Vercel AI Gateway'
      case 'openrouter':
        return 'OpenRouter'
      case 'anthropic':
        return 'Anthropic'
      default:
        return ''
    }
  }, [existingConfig])

  // Check for existing configuration on mount
  useEffect(() => {
    if (step !== 'check-existing') {
      return
    }

    const checkConfig = async (): Promise<void> => {
      try {
        const config = await getAiConfig()
        if (config) {
          setExistingConfig({
            provider: config.provider,
            model: config.model,
          })
          setStep('confirm-change')
        } else {
          setStep('select-provider')
        }
      } catch {
        setStep('select-provider')
      }
    }

    void checkConfig()
  }, [step])

  useEffect(() => {
    if (step !== 'saving' || !provider || !apiKey) {
      return
    }

    const save = async (): Promise<void> => {
      try {
        const gitRoot = await findGitRoot()
        const fsPaths = await pwdKyoto(gitRoot)

        const detailsPath = fsPaths.config
        let details: DetailsJson = {}

        try {
          const content = await readFile(detailsPath, 'utf-8')
          details = JSON.parse(content) as DetailsJson
        } catch {
          details = {}
        }

        const defaultModel = getDefaultModelForProvider(provider)

        details.ai = {
          provider,
          apiKey,
          model: defaultModel,
        }

        await writeFile(
          detailsPath,
          JSON.stringify(details, null, 2) + '\n',
          'utf-8',
        )

        const branch = await getCurrentBranch(gitRoot)
        const sha = await getCurrentCommitSha(gitRoot)
        await updateDetailsJson(detailsPath, branch, sha)

        // Update .gitignore to include .kyoto
        const gitignorePath = join(gitRoot, '.gitignore')
        const ignorePattern = '.kyoto'
        let gitignoreUpdated = false

        try {
          let gitignoreContent = ''
          try {
            gitignoreContent = await readFile(gitignorePath, 'utf-8')
          } catch {
            // .gitignore doesn't exist, we'll create it
            gitignoreContent = ''
          }

          // Check if the pattern already exists
          const lines = gitignoreContent.split('\n')
          const patternExists = lines.some(
            (line) => line.trim() === ignorePattern,
          )

          if (!patternExists) {
            // Add the pattern to .gitignore
            const newContent =
              gitignoreContent.trim() === ''
                ? ignorePattern
                : gitignoreContent.trimEnd() + '\n' + ignorePattern + '\n'
            await writeFile(gitignorePath, newContent, 'utf-8')
            gitignoreUpdated = true
          }
        } catch (err) {
          // If we can't update .gitignore, log a warning but don't fail
          logger(
            <Text color="#c27a52">
              {`\n⚠️  Could not update .gitignore: ${err instanceof Error ? err.message : 'Unknown error'}\n`}
            </Text>,
          )
        }

        logger(
          <Text>
            <Text color="green">✓</Text> Successfully configured {providerLabel}{' '}
            provider
          </Text>,
        )

        if (gitignoreUpdated) {
          logger(
            <Text>
              <Text color="green">✓</Text> Added .kyoto to .gitignore
            </Text>,
          )
          logger(
            <Text color="#c27a52">
              ⚠️ Please commit the .gitignore change to keep your API key secure
            </Text>,
          )
        }
        setStep('check-github')
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to initialize Kyoto'
        if (
          message.includes('git') ||
          message.includes('Git repository') ||
          message.includes('not a git repository')
        ) {
          logger(<Text color="#c27a52">{`\n⚠️  ${message}\n`}</Text>)
        } else {
          setError(message)
        }
        process.exitCode = 1
        setStep('done')

        // Wait before exiting on error too
        await new Promise((resolve) => setTimeout(resolve, 1000))
        exit()
      }
    }

    void save()
  }, [apiKey, exit, logger, provider, providerLabel, step])

  useEffect(() => {
    if (step !== 'check-github') {
      return
    }

    const checkGithubWorkflow = async (): Promise<void> => {
      try {
        const gitRoot = await findGitRoot()
        const githubDir = join(gitRoot, '.github', 'workflows')
        const workflowFile = join(githubDir, 'kyoto.yml')

        setWorkflowPath(workflowFile)

        try {
          await readFile(workflowFile, 'utf-8')
          logger(
            <Text color="grey">
              {
                '\n✓ GitHub Actions workflow already exists at .github/workflows/kyoto.yml\n'
              }
            </Text>,
          )
          await finishInit()
          return
        } catch {
          setStep('prompt-github')
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
        } else {
          setError(message)
        }
        process.exitCode = 1
        setStep('done')
        await new Promise((resolve) => setTimeout(resolve, 1000))
        exit()
      }
    }

    void checkGithubWorkflow()
  }, [exit, finishInit, logger, step])

  useEffect(() => {
    if (step !== 'creating-github') {
      return
    }

    const createWorkflow = async (): Promise<void> => {
      try {
        const gitRoot = await findGitRoot()
        const githubDir = join(gitRoot, '.github', 'workflows')
        const workflowFile = workflowPath ?? join(githubDir, 'kyoto.yml')
        setWorkflowPath(workflowFile)

        logger('\nCreating GitHub workflow file...\n')

        await mkdir(githubDir, { recursive: true })
        await writeFile(workflowFile, WORKFLOW_CONTENT, 'utf-8')

        logger('✓ Created .github/workflows/kyoto.yml\n')
        setStep('prompt-git')
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to setup GitHub workflow'
        if (
          message.includes('git') ||
          message.includes('Git repository') ||
          message.includes('not a git repository')
        ) {
          logger(<Text color="#c27a52">{`\n⚠️  ${message}\n`}</Text>)
        } else {
          setError(message)
        }
        process.exitCode = 1
        setStep('done')
        await new Promise((resolve) => setTimeout(resolve, 1000))
        exit()
      }
    }

    void createWorkflow()
  }, [exit, logger, step, workflowPath])

  const handleGitCommand = async (value: 'yes' | 'no'): Promise<void> => {
    if (value === 'no') {
      logger(
        <Text color="grey">
          {'\nSkipping git commit. You can commit the file manually later.\n'}
        </Text>,
      )
      await finishInit()
      return
    }

    setStep('running-git')
    logger('\nRunning git commands...\n')

    try {
      const gitRoot = await findGitRoot()

      // Add the file
      await execa('git', ['add', '.github/workflows/kyoto.yml'], {
        cwd: gitRoot,
      })

      logger('✓ Added .github/workflows/kyoto.yml to git\n')

      // Commit the file
      await execa('git', ['commit', '-m', 'chore: add Kyoto GitHub workflow'], {
        cwd: gitRoot,
      })

      logger('✓ Committed .github/workflows/kyoto.yml\n')
      logger('\n✓ GitHub workflow setup complete!\n')

      await finishInit()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to run git commands'
      setError(message)
      logger(<Text color="#c27a52">{`\n⚠️  ${message}\n`}</Text>)
      logger(
        <Text color="grey">
          {
            'You can manually run:\n  git add .github/workflows/kyoto.yml\n  git commit -m "chore: add Kyoto GitHub workflow"\n'
          }
        </Text>,
      )
      setStep('done')
      process.exitCode = 1
      await new Promise((resolve) => setTimeout(resolve, 2000))
      exit()
    }
  }

  const handleApiSubmit = (value: string): void => {
    if (!value.trim()) {
      setError('API key is required')
      return
    }

    setApiKey(value.trim())
    setError(null)
    setStep('saving')
  }

  return (
    <Box flexDirection="column">
      <Jumbo />
      {step === 'check-existing' ? (
        <Box marginTop={1} gap={1}>
          <Text color="red">
            <Spinner type="dots" />
          </Text>
          <Text>Checking existing configuration...</Text>
        </Box>
      ) : null}

      {step === 'confirm-change' && existingConfig ? (
        <Box flexDirection="column" gap={1}>
          <Text>
            Current AI provider: <Text>{existingProviderLabel}</Text>
          </Text>
          {existingConfig.model ? (
            <Text>
              Current model: <Text color="grey">{existingConfig.model}</Text>
            </Text>
          ) : null}
          <Box marginTop={1}>
            <Text>Do you want to setup a different provider?</Text>
          </Box>
          <Box marginTop={1}>
            <SelectInput
              items={[
                { label: 'Yes, change provider', value: 'yes' },
                { label: 'No, keep current provider', value: 'no' },
              ]}
              onSelect={(item) => {
                if (item.value === 'yes') {
                  setStep('select-provider')
                  setError(null)
                } else {
                  logger(
                    <Text color="grey">Keeping current configuration.</Text>,
                  )
                  setError(null)
                  setStep('check-github')
                }
              }}
            />
          </Box>
        </Box>
      ) : null}

      {step === 'select-provider' ? (
        <Box flexDirection="column" gap={1}>
          <Text>Select your AI provider:</Text>
          <Box marginTop={1}>
            <SelectInput
              items={[
                { label: 'OpenAI', value: 'openai' },
                { label: 'Vercel AI Gateway', value: 'vercel' },
                { label: 'OpenRouter', value: 'openrouter' },
                { label: 'Anthropic', value: 'anthropic' },
              ]}
              onSelect={(item) => {
                setProvider(item.value as Provider)
                setStep('api-key')
                setError(null)
              }}
            />
          </Box>
        </Box>
      ) : null}

      {step === 'api-key' && provider ? (
        <Box flexDirection="column" marginTop={1}>
          <Text>
            Enter your {providerLabel} API key (press Enter to submit):
          </Text>
          <TextInput
            value={apiKey}
            mask="*"
            onChange={(value) => setApiKey(value)}
            onSubmit={handleApiSubmit}
          />
        </Box>
      ) : null}

      {step === 'saving' ? (
        <Box marginTop={1} gap={1}>
          <Text color="red">
            <Spinner type="dots" />
          </Text>
          <Text>Saving configuration...</Text>
        </Box>
      ) : null}

      {step === 'check-github' ? (
        <Box marginTop={1} gap={1}>
          <Text color="red">
            <Spinner type="dots" />
          </Text>
          <Text>Checking for GitHub Actions workflow...</Text>
        </Box>
      ) : null}

      {step === 'prompt-github' ? (
        <Box flexDirection="column" marginTop={1} gap={1}>
          <Text>No GitHub Actions workflow found.</Text>
          <Text>
            Would you like to create .github/workflows/kyoto.yml now? (Y/n)
          </Text>
          <Box marginTop={1}>
            <SelectInput
              items={[
                { label: 'Yes, set it up', value: 'yes' },
                { label: 'No, maybe later', value: 'no' },
              ]}
              onSelect={(item) => {
                if (item.value === 'yes') {
                  setError(null)
                  setStep('creating-github')
                } else {
                  logger(
                    <Text color="grey">
                      {'\nSkipping GitHub Actions setup for now.\n'}
                    </Text>,
                  )
                  setError(null)
                  void finishInit()
                }
              }}
            />
          </Box>
        </Box>
      ) : null}

      {step === 'creating-github' ? (
        <Box marginTop={1} gap={1}>
          <Text color="red">
            <Spinner type="dots" />
          </Text>
          <Text>Creating GitHub workflow file...</Text>
        </Box>
      ) : null}

      {step === 'prompt-git' && workflowPath ? (
        <Box flexDirection="column" marginTop={1} gap={1}>
          <Text>
            {'\n'}Run the following command to commit the workflow file:
          </Text>
          <Text color="yellow">{'\n'} git add .github/workflows/kyoto.yml</Text>
          <Text color="yellow">
            {'  '}git commit -m "chore: add Kyoto GitHub workflow"
          </Text>
          <Text>{'\n'}Do you want to run this command now? (Y/n)</Text>
          <Box marginTop={1}>
            <SelectInput
              items={[
                { label: 'Yes, run the command', value: 'yes' },
                { label: 'No, skip', value: 'no' },
              ]}
              onSelect={(item) => {
                void handleGitCommand(item.value as 'yes' | 'no')
              }}
            />
          </Box>
        </Box>
      ) : null}

      {step === 'running-git' ? (
        <Box marginTop={1} gap={1}>
          <Text color="red">
            <Spinner type="dots" />
          </Text>
          <Text>Running git commands...</Text>
        </Box>
      ) : null}

      {logs.map((line) => {
        return <React.Fragment key={line.key}>{line.content}</React.Fragment>
      })}
      {error ? <Text color="red">{error}</Text> : null}
    </Box>
  )
}
