import { findGitRoot } from '@app/shell'
import { Box, Text, useApp } from 'ink'
import { resolve } from 'node:path'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import terminalLink from 'terminal-link'

import { init } from '../helpers/config/assert-cli-prerequisites'
import { Header } from '../helpers/display/display-header'
import { searchStories } from '../helpers/stories/search-stories'
import { type Logger } from '../types/logger'

interface SearchProps {
  query: string
  limit?: number
  threshold?: string
}

export default function Search({
  query,
  limit = 10,
  threshold,
}: SearchProps): React.ReactElement {
  const { exit } = useApp()
  const [logs, setLogs] = useState<{ content: React.ReactNode; key: string }[]>(
    [],
  )
  const [error, setError] = useState<string | null>(null)

  const logger = useCallback<Logger>((message) => {
    const content =
      typeof message === 'string' ? <Text>{message}</Text> : message

    const key = `${Date.now()}-${Math.random()}`
    setLogs((prev) => [...prev, { content, key }])
  }, [])

  const thresholdValue = useMemo(() => {
    if (!threshold) {
      return undefined
    }
    const parsed = parseFloat(threshold)
    if (Number.isNaN(parsed)) {
      return NaN
    }
    return parsed
  }, [threshold])

  useEffect(() => {
    const run = async (): Promise<void> => {
      try {
        if (thresholdValue !== undefined && Number.isNaN(thresholdValue)) {
          throw new Error('Threshold must be a valid number')
        }

        await init({ requireAi: true })

        logger(<Text color="grey">{`• Searching for: ${query}`}</Text>)
        if (limit) {
          logger(<Text color="grey">{`• Limit: ${limit.toString()}`}</Text>)
        }

        if (thresholdValue !== undefined) {
          logger(
            <Text color="grey">{`• Threshold: ${thresholdValue.toString()}`}</Text>,
          )
        }
        logger('')

        const results = await searchStories({
          queryText: query,
          topK: limit,
          threshold: thresholdValue,
        })

        if (results.length === 0) {
          logger(
            <Text color="#c27a52">{`\n⚠️  No stories found matching the query.\n`}</Text>,
          )
          return
        }

        logger(
          <Text color="grey">
            {`• Found ${results.length.toString()} ${results.length === 1 ? 'story' : 'stories'}:\n`}
          </Text>,
        )

        const gitRoot = await findGitRoot()
        for (const story of results) {
          const absolutePath = resolve(gitRoot, story.filePath)
          const linkUrl = `vscode://file/${absolutePath}`

          let titleWithScore = story.title
          let scoreColor: string | undefined
          if (story.score !== undefined) {
            scoreColor =
              story.score >= 0.8
                ? '#7ba179'
                : story.score >= 0.6
                  ? '#d4a574'
                  : 'grey'
            titleWithScore = `${story.title} (${story.score.toFixed(3)})`
          }

          const titleLink = terminalLink(titleWithScore, linkUrl)
          logger(<Text color={scoreColor ?? '#7ba179'}>{titleLink}</Text>)

          if (story.behavior) {
            logger(<Text color="grey">{`  ${story.behavior}`}</Text>)
          }

          logger(<Text color="grey">{`  ${story.filePath}`}</Text>)
          logger('')
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to search stories'
        setError(message)
        process.exitCode = 1
      } finally {
        exit()
      }
    }

    void run()
  }, [exit, limit, logger, query, thresholdValue])

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
