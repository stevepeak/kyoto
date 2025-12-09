import { findGitRoot } from '@app/shell'
import { execa } from 'execa'
import { Box, Text, useApp } from 'ink'
import SelectInput from 'ink-select-input'
import Spinner from 'ink-spinner'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import React, { useEffect, useState } from 'react'

import { Header } from '../../helpers/display/display-header'

type Step =
  | 'checking'
  | 'exists'
  | 'creating'
  | 'created'
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
        run: npx kyoto test
`

export default function SetupGithub(): React.ReactElement {
  const { exit } = useApp()
  const [step, setStep] = useState<Step>('checking')
  const [logs, setLogs] = useState<
    ({ message: string; color?: string } | { content: React.ReactElement })[]
  >([])
  const [error, setError] = useState<string | null>(null)
  const [workflowPath, setWorkflowPath] = useState<string | null>(null)

  useEffect(() => {
    if (step !== 'checking') {
      return
    }

    const checkAndCreate = async (): Promise<void> => {
      try {
        const gitRoot = await findGitRoot()
        const githubDir = join(gitRoot, '.github', 'workflows')
        const workflowFile = join(githubDir, 'kyoto.yml')

        setWorkflowPath(workflowFile)

        // Check if file already exists
        try {
          await readFile(workflowFile, 'utf-8')
          setStep('exists')
          setLogs([
            {
              message: `\n✓ Workflow file already exists at .github/workflows/kyoto.yml\n`,
              color: 'grey',
            },
            {
              message: 'No action needed.\n',
            },
          ])
          setTimeout(() => {
            exit()
          }, 1500)
          return
        } catch {
          // File doesn't exist, proceed with creation
        }

        setStep('creating')
        setLogs([
          {
            message: '\nCreating GitHub workflow file...\n',
          },
        ])

        // Create .github/workflows directory if it doesn't exist
        await mkdir(githubDir, { recursive: true })

        // Write the workflow file
        await writeFile(workflowFile, WORKFLOW_CONTENT, 'utf-8')

        setStep('created')
        setLogs((prev) => [
          ...prev,
          {
            message: `✓ Created .github/workflows/kyoto.yml\n`,
          },
        ])

        // Wait a moment before showing git command
        await new Promise((resolve) => setTimeout(resolve, 500))
        setStep('prompt-git')
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to setup GitHub workflow'
        if (
          message.includes('git') ||
          message.includes('Git repository') ||
          message.includes('not a git repository')
        ) {
          setLogs((prev) => [
            ...prev,
            {
              message: `\n⚠️  ${message}\n`,
              color: '#c27a52',
            },
          ])
        } else {
          setError(message)
        }
        process.exitCode = 1
        setStep('done')
        await new Promise((resolve) => setTimeout(resolve, 1000))
        exit()
      }
    }

    void checkAndCreate()
  }, [exit, step])

  const handleGitCommand = async (value: 'yes' | 'no'): Promise<void> => {
    if (value === 'no') {
      setLogs((prev) => [
        ...prev,
        {
          message:
            '\nSkipping git commit. You can commit the file manually later.\n',
          color: 'grey',
        },
      ])
      setStep('done')
      setTimeout(() => {
        exit()
      }, 1500)
      return
    }

    setStep('running-git')
    setLogs((prev) => [
      ...prev,
      {
        message: '\nRunning git commands...\n',
      },
    ])

    try {
      const gitRoot = await findGitRoot()

      // Add the file
      await execa('git', ['add', '.github/workflows/kyoto.yml'], {
        cwd: gitRoot,
      })

      setLogs((prev) => [
        ...prev,
        {
          message: '✓ Added .github/workflows/kyoto.yml to git\n',
        },
      ])

      // Commit the file
      await execa('git', ['commit', '-m', 'chore: add Kyoto GitHub workflow'], {
        cwd: gitRoot,
      })

      setLogs((prev) => [
        ...prev,
        {
          message: '✓ Committed .github/workflows/kyoto.yml\n',
        },
        {
          message: '\n✓ GitHub workflow setup complete!\n',
        },
      ])

      setStep('done')
      await new Promise((resolve) => setTimeout(resolve, 1000))
      exit()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to run git commands'
      setError(message)
      setLogs((prev) => [
        ...prev,
        {
          message: `\n⚠️  ${message}\n`,
          color: '#c27a52',
        },
        {
          message:
            'You can manually run:\n  git add .github/workflows/kyoto.yml\n  git commit -m "chore: add Kyoto GitHub workflow"\n',
          color: 'grey',
        },
      ])
      setStep('done')
      process.exitCode = 1
      await new Promise((resolve) => setTimeout(resolve, 2000))
      exit()
    }
  }

  return (
    <Box flexDirection="column">
      <Header message="Setup GitHub Workflow" />
      {step === 'checking' ? (
        <Box marginTop={1} gap={1}>
          <Text color="red">
            <Spinner type="dots" />
          </Text>
          <Text>Checking for existing workflow...</Text>
        </Box>
      ) : null}

      {step === 'creating' ? (
        <Box marginTop={1} gap={1}>
          <Text color="red">
            <Spinner type="dots" />
          </Text>
          <Text>Creating workflow file...</Text>
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

      {logs.map((line, index) => {
        if ('content' in line) {
          return <React.Fragment key={index}>{line.content}</React.Fragment>
        }
        return (
          <Text key={`${index}-${line.message}`} color={line.color}>
            {line.message}
          </Text>
        )
      })}

      {step === 'prompt-git' && workflowPath ? (
        <Box flexDirection="column" marginTop={1}>
          <Text>
            {'\n'}Run the following command to commit the workflow file:
          </Text>
          <Text color="yellow">{'\n'} git add .github/workflows/kyoto.yml</Text>
          <Text color="yellow">
            {'  '}git commit -m "chore: add Kyoto GitHub workflow"
          </Text>
          <Text>{'\n'}Do you want to run this command now? (Y/n)</Text>
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
      ) : null}

      {error ? <Text color="red">{error}</Text> : null}
    </Box>
  )
}
