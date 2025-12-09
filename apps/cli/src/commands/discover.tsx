import { agents } from '@app/agents'
import { type DiscoveredStory } from '@app/schemas'
import { Box, Text, useApp } from 'ink'
import { stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import React, { useEffect, useState } from 'react'

import { init } from '../helpers/config/assert-cli-prerequisites'
import { getModel } from '../helpers/config/get-model'
import { updateDetailsJson } from '../helpers/config/update-details-json'
import { Header } from '../helpers/display/display-header'
import { useSpinner } from '../helpers/display/use-spinner'
import {
  findTypeScriptFiles,
  validateFilePath,
} from '../helpers/file/discovery'
import {
  formatCommandError,
  handleCommandError,
} from '../helpers/error-handling/command-error-boundary'
import {
  handleError,
  isCriticalError,
  shouldHandleInCommand,
} from '../helpers/error-handling/handle-error'
import { useCliLogger } from '../helpers/logging/logger'
import { processDiscoveredCandidates } from '../helpers/stories/process-candidates'

interface DiscoverProps {
  folder?: string
  model?: string
  provider?: 'openai' | 'vercel' | 'auto'
  limit?: number
}

export default function Discover({
  folder,
  model,
  provider = 'auto',
  limit,
}: DiscoverProps): React.ReactElement {
  const { exit } = useApp()
  const { logs, logger } = useCliLogger()
  const [error, setError] = useState<string | null>(null)
  const { createSpinner, clearSpinner, SpinnerDisplay } = useSpinner()

  useEffect(() => {
    let isMounted = true

    const run = async (): Promise<void> => {
      try {
        const { git, fs } = await init()

        const inputPath = folder || '.'
        await validateFilePath(inputPath)

        const resolvedPath = resolve(fs.gitRoot, inputPath)
        const stats = await stat(resolvedPath)
        const isDirectory = stats.isDirectory()

        const filesToProcess = isDirectory
          ? await findTypeScriptFiles(inputPath)
          : [inputPath]

        if (filesToProcess.length === 0) {
          logger(
            <Text color="#c27a52">{`\n⚠️  No TypeScript files found in ${inputPath}\n`}</Text>,
          )
          return
        }

        logger(
          <Text color="grey">
            {`• Exploring stories within ${filesToProcess.length} ${filesToProcess.length === 1 ? 'file' : 'files'}`}
          </Text>,
        )

        let totalProcessedStories = 0
        const storyLimit = limit

        const {
          model: selectedModel,
          modelId,
          provider: selectedProvider,
        } = await getModel({
          model,
          provider,
          logger,
        })
        logger(
          <Text color="grey">{`• Using ${modelId} on ${selectedProvider}`}</Text>,
        )

        if (storyLimit) {
          logger(
            <Text color="grey">{`• Limit ${storyLimit.toString()} behaviors`}</Text>,
          )
        }

        for (const filePath of filesToProcess) {
          if (!isMounted) {
            break
          }

          if (storyLimit && totalProcessedStories >= storyLimit) {
            logger(
              <Text color="grey">
                {`\n• Reached story limit of ${storyLimit.toString()}. Stopping discovery.\n`}
              </Text>,
            )
            break
          }
          logger('')
          logger(`Evaluating ${filePath}`)

          try {
            const remainingLimit = storyLimit
              ? storyLimit - totalProcessedStories
              : undefined

            const discoverySpinner = createSpinner({
              title: 'Discovery Agent',
              progress: 'Starting...',
            })

            const discoveryResult = await agents.discovery.run({
              filePath,
              options: {
                model: selectedModel,
                maxStories: remainingLimit,
                logger: discoverySpinner.progress,
              },
            })

            const candidates = (
              discoveryResult as { stories: DiscoveredStory[] }
            ).stories

            if (candidates.length === 0) {
              discoverySpinner.succeed('No candidate behaviors found')
              continue
            }

            discoverySpinner.succeed(
              `Found ${candidates.length} candidate behavior${candidates.length === 1 ? '' : 's'}`,
            )

            logger('')

            const processedStories = await processDiscoveredCandidates({
              candidates,
              model: selectedModel,
              logger,
              createSpinner,
            })

            totalProcessedStories += processedStories.length
          } catch (err) {
            logger(<Text color="red">{`✖ ${filePath}`}</Text>)
            logger(
              <Text color="#c27a52">{`\n⚠️  Failed to generate stories\n`}</Text>,
            )

            // Critical errors (API key, gateway) should stop processing
            // Re-throw to bubble up to top-level handler
            if (isCriticalError(err)) {
              throw err
            }

            // For non-critical errors, log and continue with next file
            // These will be handled by the top-level handler if they bubble up
            handleCommandError(err, logger)
          }
        }

        const detailsPath = fs.config
        await updateDetailsJson(detailsPath, git.branch, git.sha)

        if (totalProcessedStories === 0) {
          logger(<Text color="#c27a52">{'\nNo stories generated\n'}</Text>)
          return
        }

        logger(
          <Text color="#7ba179">
            {`\n√ Processed ${totalProcessedStories} ${totalProcessedStories === 1 ? 'story' : 'stories'} from ${filesToProcess.length} ${filesToProcess.length === 1 ? 'file' : 'files'}:\n`}
          </Text>,
        )
      } catch (err) {
        // Check if this is a command-specific error (file not found, etc.)
        if (shouldHandleInCommand(err)) {
          // Command-specific error - format and display
          logger(formatCommandError(err))
          process.exitCode = 1
        } else {
          // Use centralized error handler
          handleError(err, {
            logger,
            setExitCode: (code) => {
              process.exitCode = code
            },
          })
          // Set error state for display
          const message =
            err instanceof Error ? err.message : 'Failed to generate stories'
          setError(message)
        }
      } finally {
        clearSpinner()
        exit()
      }
    }

    void run()

    return () => {
      isMounted = false
    }
  }, [
    clearSpinner,
    createSpinner,
    exit,
    folder,
    limit,
    logger,
    model,
    provider,
  ])

  return (
    <Box flexDirection="column">
      <Header message="Never stop exploring." />
      {logs.map((line) => (
        <React.Fragment key={line.key}>{line.content}</React.Fragment>
      ))}
      <SpinnerDisplay />
      {error ? <Text color="red">{error}</Text> : null}
    </Box>
  )
}
