import { agents } from '@app/agents'
import { type DiscoveredStory } from '@app/schemas'
import { Box, Text, useApp } from 'ink'
import Spinner from 'ink-spinner'
import { stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { init } from '../helpers/config/assert-cli-prerequisites'
import { getModel } from '../helpers/config/get-model'
import { updateDetailsJson } from '../helpers/config/update-details-json'
import { Header } from '../helpers/display/display-header'
import {
  findTypeScriptFiles,
  validateFilePath,
} from '../helpers/file/discovery'
import { processDiscoveredCandidates } from '../helpers/stories/process-candidates'
import { type Logger } from '../types/logger'

interface DiscoverProps {
  folder?: string
  model?: string
  provider?: 'openai' | 'vercel' | 'auto'
  limit?: number
}

type SpinnerState = {
  id: number
  text: string
  state: 'running' | 'success' | 'fail'
}

export default function Discover({
  folder,
  model,
  provider = 'auto',
  limit,
}: DiscoverProps): React.ReactElement {
  const { exit } = useApp()
  const [logs, setLogs] = useState<{ content: React.ReactNode; key: string }[]>(
    [],
  )
  const [error, setError] = useState<string | null>(null)
  const [activeSpinner, setActiveSpinner] = useState<SpinnerState | null>(null)
  const spinnerIdRef = useRef(0)

  const logger = useCallback<Logger>((message) => {
    const content =
      typeof message === 'string' ? <Text>{message}</Text> : message

    const key = `${Date.now()}-${Math.random()}`
    setLogs((prev) => [...prev, { content, key }])
  }, [])

  const createSpinner = useCallback((text: string) => {
    const id = spinnerIdRef.current++
    setActiveSpinner({ id, text, state: 'running' })

    return {
      update: (next: string) => {
        setActiveSpinner((prev) =>
          prev && prev.id === id ? { ...prev, text: next } : prev,
        )
      },
      succeed: (next?: string) => {
        setActiveSpinner((prev) =>
          prev && prev.id === id
            ? {
                ...prev,
                text: next ?? prev.text,
                state: 'success',
              }
            : prev,
        )
      },
      fail: (next?: string) => {
        setActiveSpinner((prev) =>
          prev && prev.id === id
            ? {
                ...prev,
                text: next ?? prev.text,
                state: 'fail',
              }
            : prev,
        )
      },
      stop: () => {
        setActiveSpinner((prev) => (prev && prev.id === id ? null : prev))
      },
    }
  }, [])

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

            const discoverySpinner = createSpinner(
              'Discovery Agent: Starting...',
            )

            const discoveryResult = await agents.discovery.run({
              filePath,
              options: {
                model: selectedModel,
                maxStories: remainingLimit,
                logger: (msg: React.ReactNode | string) => {
                  const text = typeof msg === 'string' ? msg : String(msg)
                  discoverySpinner.update(`Discovery Agent: ${text}`)
                },
              },
            })

            const candidates = (
              discoveryResult as { stories: DiscoveredStory[] }
            ).stories

            if (candidates.length === 0) {
              discoverySpinner.succeed(
                'Discovery Agent: No candidate behaviors found',
              )
              continue
            }

            discoverySpinner.succeed(
              `Discovery Agent: Found ${candidates.length} candidate behavior${candidates.length === 1 ? '' : 's'}`,
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

            if (err instanceof Error) {
              if (
                err.message.includes('API key') ||
                err.message.includes('authentication') ||
                err.message.includes('unauthorized')
              ) {
                logger(
                  <Text color="#c27a52">
                    The API key appears to be invalid or expired.\n
                  </Text>,
                )
                logger(
                  <Text color="#7c6653">
                    Please check your API key configuration. Run `kyoto init` to
                    reconfigure.\n
                  </Text>,
                )
              } else if (
                err.message.includes('Vercel AI Gateway') ||
                err.message.includes('Gateway request failed') ||
                err.message.includes('Invalid error response format')
              ) {
                logger(
                  <Text color="#c27a52">AI Gateway error detected.\n</Text>,
                )
                logger(
                  <Text color="#7c6653">
                    The AI Gateway request failed. This could be due to:\n
                  </Text>,
                )
                logger(
                  <Text color="#7c6653"> - Invalid or expired API key\n</Text>,
                )
                logger(
                  <Text color="#7c6653"> - Network connectivity issues\n</Text>,
                )
                logger(
                  <Text color="#7c6653">
                    {' '}
                    - Gateway service temporarily unavailable\n
                  </Text>,
                )
                logger(
                  <Text color="#7c6653">
                    \nRun `kyoto init` to reconfigure your API key, or try using
                    --provider openai instead.\n
                  </Text>,
                )
              } else {
                logger(<Text color="#7c6653">{`Error: ${err.message}\n`}</Text>)
              }
            } else {
              logger(<Text color="#7c6653">An unknown error occurred.\n</Text>)
            }
          }
        }

        const detailsPath = fs.details
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
        const message =
          err instanceof Error ? err.message : 'Failed to generate stories'
        if (
          message.includes('not found') ||
          message.includes('Path is not a file') ||
          message.includes('Path is not a directory')
        ) {
          logger(<Text color="#c27a52">{`\n⚠️  ${message}\n`}</Text>)
        } else {
          setError(message)
        }
        process.exitCode = 1
      } finally {
        setActiveSpinner(null)
        exit()
      }
    }

    void run()

    return () => {
      isMounted = false
    }
  }, [createSpinner, exit, folder, limit, logger, model, provider])

  return (
    <Box flexDirection="column">
      <Header message="Discover" />
      {logs.map((line) => (
        <React.Fragment key={line.key}>{line.content}</React.Fragment>
      ))}
      {activeSpinner ? (
        <Box marginTop={1} gap={1} flexDirection="row">
          {activeSpinner.state === 'running' ? (
            <Text color="red">
              <Spinner type="dots" />
            </Text>
          ) : (
            <Text color={activeSpinner.state === 'success' ? 'green' : 'red'}>
              •
            </Text>
          )}
          <Text>{activeSpinner.text}</Text>
        </Box>
      ) : null}
      {error ? <Text color="red">{error}</Text> : null}
    </Box>
  )
}
