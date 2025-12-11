import { findGitRoot } from '@app/shell'
import { Box, Text } from 'ink'
import Spinner from 'ink-spinner'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import React, { useEffect, useState } from 'react'

import { useCliLogger } from '../../helpers/logging/logger'

type Step = 'checking' | 'updating' | 'done'
type ComponentState = 'pending' | 'active' | 'completed'

interface GitIgnoreProps {
  state: ComponentState
  onComplete: () => void
}

export function GitIgnore({
  state,
  onComplete,
}: GitIgnoreProps): React.ReactElement {
  const [step, setStep] = useState<Step>('checking')
  const [isAlreadyConfigured, setIsAlreadyConfigured] = useState(false)
  const { logs, logger } = useCliLogger()

  useEffect(() => {
    if (state !== 'active' || step !== 'checking') {
      return
    }

    const checkAndUpdateGitignore = async (): Promise<void> => {
      try {
        const gitRoot = await findGitRoot()
        const gitignorePath = join(gitRoot, '.gitignore')
        const ignorePattern = '.kyoto'

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

        if (patternExists) {
          setIsAlreadyConfigured(true)
          setStep('done')
          onComplete()
          return
        }

        // Pattern doesn't exist, update it
        setStep('updating')
        const newContent =
          gitignoreContent.trim() === ''
            ? ignorePattern
            : gitignoreContent.trimEnd() + '\n' + ignorePattern + '\n'
        await writeFile(gitignorePath, newContent, 'utf-8')

        logger(
          <Text>
            <Text color="green">✓</Text> Added .kyoto to .gitignore
          </Text>,
        )

        setStep('done')
        onComplete()
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to update .gitignore'
        if (
          message.includes('git') ||
          message.includes('Git repository') ||
          message.includes('not a git repository')
        ) {
          logger(<Text color="#c27a52">{`\n⚠️  ${message}\n`}</Text>)
        } else {
          logger(<Text color="red">{`\n❌ ${message}\n`}</Text>)
        }
        // Don't complete on error - this is a requirement
        process.exitCode = 1
      }
    }

    void checkAndUpdateGitignore()
  }, [logger, onComplete, state, step])

  if (state === 'pending') {
    return (
      <Box marginTop={1}>
        <Text color="grey">• Configure .gitignore</Text>
      </Box>
    )
  }

  if (state === 'completed') {
    return (
      <Box flexDirection="column">
        <Text>
          <Text color="green">✓</Text> .gitignore
        </Text>
        {isAlreadyConfigured ? (
          <Text color="grey">
            {'  '}
            <Text>- </Text>
            <Text>.kyoto in .gitignore</Text>
          </Text>
        ) : (
          <Text color="grey">
            {'  '}
            <Text>- </Text>
            <Text>Added .kyoto to .gitignore</Text>
          </Text>
        )}
        {logs.map((line) => {
          return <React.Fragment key={line.key}>{line.content}</React.Fragment>
        })}
      </Box>
    )
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      {step === 'checking' || step === 'updating' ? (
        <Box flexDirection="column">
          <Text>
            <Text color="red">
              <Spinner type="dots" />
            </Text>{' '}
            .gitignore
          </Text>
          {step === 'updating' ? (
            <Text color="grey">Adding .kyoto to .gitignore...</Text>
          ) : (
            <Text color="grey">Checking .gitignore...</Text>
          )}
        </Box>
      ) : null}

      {logs.map((line) => {
        return <React.Fragment key={line.key}>{line.content}</React.Fragment>
      })}
    </Box>
  )
}
