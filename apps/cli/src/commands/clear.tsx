import { Box, Text, useApp } from 'ink'
import { rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import React, { useEffect, useState } from 'react'

import { init } from '../helpers/config/assert-cli-prerequisites'
import { Header } from '../helpers/display/display-header'
import { useCliLogger } from '../helpers/logging/logger'

export default function Clear(): React.ReactElement {
  const { exit } = useApp()
  const { logs, logger } = useCliLogger()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async (): Promise<void> => {
      try {
        const { fs } = await init({ requireAi: false })

        const { stories, artifacts, root } = fs

        try {
          await stat(stories)
          await rm(stories, { recursive: true, force: true })
          logger(<Text color="#7ba179">✓ Deleted stories directory</Text>)
        } catch (err) {
          if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
            logger(
              <Text color="grey">
                Stories directory does not exist, skipping
              </Text>,
            )
          } else {
            throw err
          }
        }

        try {
          await stat(artifacts)
          await rm(artifacts, { recursive: true, force: true })
          logger(<Text color="#7ba179">✓ Deleted artifacts directory</Text>)
        } catch (err) {
          if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
            logger(
              <Text color="grey">
                Artifacts directory does not exist, skipping
              </Text>,
            )
          } else {
            throw err
          }
        }

        const vectraPath = join(root, 'cache', 'vectra.json')
        try {
          await stat(vectraPath)
          await rm(vectraPath, { recursive: true, force: true })
          logger(<Text color="#7ba179">✓ Deleted vectra data</Text>)
        } catch (err) {
          if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
            logger(
              <Text color="grey">Vectra data does not exist, skipping</Text>,
            )
          } else {
            throw err
          }
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to clear stories and vectra data'

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
        exit()
      }
    }

    void run()
  }, [exit, logger])

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
