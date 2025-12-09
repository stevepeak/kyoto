import { findGitRoot } from '@app/shell'
import { Box, Text, useApp } from 'ink'
import { resolve } from 'node:path'
import React, { useCallback, useEffect, useState } from 'react'
import terminalLink from 'terminal-link'

import { assertCliPrerequisites } from '../helpers/config/assert-cli-prerequisites'
import { Header } from '../helpers/display/display-header'
import { readAllStoryFiles } from '../helpers/file/reader'
import { type Logger } from '../types/logger'

export default function List(): React.ReactElement {
  const { exit } = useApp()
  const [logs, setLogs] = useState<{ message: string; color?: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const logger = useCallback<Logger>((message, color) => {
    setLogs((prev) => [...prev, { message, color }])
  }, [])

  useEffect(() => {
    let isMounted = true

    const run = async (): Promise<void> => {
      try {
        await assertCliPrerequisites({ requireAi: false })

        const storyFiles = await readAllStoryFiles()

        if (storyFiles.length === 0) {
          logger(
            `\n⚠️  No story files found in .kyoto/stories directory.\n`,
            '#c27a52',
          )
          return
        }

        logger(
          `• Found ${storyFiles.length.toString()} ${storyFiles.length === 1 ? 'story' : 'stories'}:\n`,
          'grey',
        )

        const gitRoot = await findGitRoot()
        for (const storyFile of storyFiles) {
          if (!isMounted) {
            return
          }
          const absolutePath = resolve(gitRoot, storyFile.path)
          const linkUrl = `vscode://file/${absolutePath}`
          const titleLink = terminalLink(storyFile.story.title, linkUrl)
          logger(titleLink, '#7ba179')
          if (storyFile.story.behavior) {
            logger(`${storyFile.story.behavior}`, 'grey')
          }
          logger('')
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to list stories'

        if (
          message.includes('not found') ||
          message.includes('.kyoto directory not found')
        ) {
          logger(`\n⚠️  ${message}\n`, '#c27a52')
        } else {
          setError(message)
        }
        process.exitCode = 1
      } finally {
        setDone(true)
      }
    }

    void run()

    return () => {
      isMounted = false
    }
  }, [exit, logger])

  useEffect(() => {
    if (done) {
      // Allow the final render to flush before exiting
      setTimeout(() => exit(), 0)
    }
  }, [done, exit])

  return (
    <Box flexDirection="column">
      <Header />
      {logs.map((line, index) => (
        <Text key={`${index}-${line.message}`} color={line.color}>
          {line.message}
        </Text>
      ))}
      {error ? <Text color="red">{error}</Text> : null}
    </Box>
  )
}
