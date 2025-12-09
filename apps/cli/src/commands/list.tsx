import { findGitRoot } from '@app/shell'
import { Box, Text, useApp } from 'ink'
import { resolve } from 'node:path'
import React, { useCallback, useEffect, useState } from 'react'
import terminalLink from 'terminal-link'

import { init } from '../helpers/config/assert-cli-prerequisites'
import { Header } from '../helpers/display/display-header'
import { readAllStoryFiles } from '../helpers/file/reader'
import { type Logger } from '../types/logger'

export default function List(): React.ReactElement {
  const { exit } = useApp()
  const [logs, setLogs] = useState<{ content: React.ReactNode; key: string }[]>(
    [],
  )
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const logger = useCallback<Logger>((message) => {
    const content =
      typeof message === 'string' ? <Text>{message}</Text> : message

    const key = `${Date.now()}-${Math.random()}`
    setLogs((prev) => [...prev, { content, key }])
  }, [])

  useEffect(() => {
    let isMounted = true

    const run = async (): Promise<void> => {
      try {
        await init({ requireAi: false })

        const storyFiles = await readAllStoryFiles()

        if (storyFiles.length === 0) {
          logger(
            <Text color="#c27a52">
              {`\n⚠️  No story files found in .kyoto/stories directory.\n`}
            </Text>,
          )
          return
        }

        logger(
          <Text color="grey">
            {`• Found ${storyFiles.length.toString()} ${storyFiles.length === 1 ? 'story' : 'stories'}:\n`}
          </Text>,
        )

        const gitRoot = await findGitRoot()
        for (const storyFile of storyFiles) {
          if (!isMounted) {
            return
          }
          const absolutePath = resolve(gitRoot, storyFile.path)
          const linkUrl = `vscode://file/${absolutePath}`
          const titleLink = terminalLink(storyFile.story.title, linkUrl)
          logger(<Text color="#7ba179">{titleLink}</Text>)
          if (storyFile.story.behavior) {
            logger(<Text color="grey">{storyFile.story.behavior}</Text>)
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
          logger(<Text color="#c27a52">{`\n⚠️  ${message}\n`}</Text>)
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
      {logs.map((line) => (
        <React.Fragment key={line.key}>{line.content}</React.Fragment>
      ))}
      {error ? <Text color="red">{error}</Text> : null}
    </Box>
  )
}
