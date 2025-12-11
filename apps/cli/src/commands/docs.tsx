import { execa } from 'execa'
import { Box, Text, useApp } from 'ink'
import { useEffect, useState } from 'react'

import { Footer } from '../ui/footer'
import { Jumbo } from '../ui/jumbo'

const DOCS_URL = 'https://docs.usekyoto.com'

function getOpenCommand(): string {
  const platform = process.platform
  if (platform === 'darwin') {
    return 'open'
  }
  if (platform === 'win32') {
    return 'start'
  }
  // Linux and other Unix-like systems
  return 'xdg-open'
}

export default function Docs(): React.ReactElement {
  const { exit } = useApp()
  const [status, setStatus] = useState<'opening' | 'opened' | 'error'>(
    'opening',
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const openDocs = async () => {
      try {
        const command = getOpenCommand()
        await execa(command, [DOCS_URL])
        setStatus('opened')
        setTimeout(() => {
          exit()
        }, 1000)
      } catch (error) {
        setStatus('error')
        setErrorMessage(
          error instanceof Error ? error.message : 'Unknown error occurred',
        )
        setTimeout(() => {
          exit()
        }, 2000)
      }
    }

    openDocs()
  }, [exit])

  return (
    <Box flexDirection="column">
      <Jumbo />
      <Text> </Text>
      <Box flexDirection="column" marginBottom={1}>
        {status === 'opening' && (
          <Text>
            Opening <Text color="blue">{DOCS_URL}</Text> in your browser...
          </Text>
        )}
        {status === 'opened' && (
          <Text>
            <Text color="green">✓</Text> Opened{' '}
            <Text color="blue">{DOCS_URL}</Text> in your browser
          </Text>
        )}
        {status === 'error' && (
          <Box flexDirection="column">
            <Text color="red">✗ Failed to open documentation in browser</Text>
            {errorMessage && <Text dimColor>{errorMessage}</Text>}
            <Text> </Text>
            <Text>
              Please visit <Text color="blue">{DOCS_URL}</Text> manually
            </Text>
          </Box>
        )}
      </Box>
      <Footer />
      <Text> </Text>
      <Text> </Text>
    </Box>
  )
}
