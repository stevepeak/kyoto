import { Box, Text, useApp, useInput, useStdin } from 'ink'
import Spinner from 'ink-spinner'
import { Marked } from 'marked'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { markedTerminal } = require('marked-terminal') as {
  markedTerminal: () => object
}
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import {
  type BrowserTestAgent,
  createBrowserTestAgent,
} from '../../agents/test-browser'
import { init } from '../../helpers/init'
import { Header } from '../../ui/header'
import { Jumbo } from '../../ui/jumbo'

// Create a marked instance with terminal renderer for pretty markdown output
const marked = new Marked()
marked.use(markedTerminal())

function renderMarkdown(text: string): string {
  return (marked.parse(text) as string).trim()
}

type TestState =
  | 'initializing'
  | 'checking-instructions'
  | 'launching-browser'
  | 'running-agent'
  | 'waiting-for-input'
  | 'error'
  | 'exiting'
  | 'browser-closed'

export default function Test(): React.ReactElement {
  const { exit } = useApp()
  const { isRawModeSupported } = useStdin()

  const [state, setState] = useState<TestState>('initializing')
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string>('Starting...')
  const [agentResponse, setAgentResponse] = useState<string | null>(null)
  const [userInput, setUserInput] = useState<string>('')
  const [logs, setLogs] = useState<string[]>([])

  const agentRef = useRef<BrowserTestAgent | null>(null)
  const cancelledRef = useRef(false)

  const addLog = useCallback((message: string) => {
    setLogs((prev) => [...prev.slice(-20), message])
  }, [])

  // Initialize and run
  useEffect(() => {
    cancelledRef.current = false

    const run = async (): Promise<void> => {
      try {
        setState('initializing')
        setProgress('Initializing...')

        const { fs, model } = await init()

        if (cancelledRef.current) return

        // Check for instructions.md
        setState('checking-instructions')
        setProgress('Checking for instructions.md...')

        if (!existsSync(fs.instructions)) {
          setError(
            `No instructions file found at ${fs.instructions}\n\nCreate a .kyoto/instructions.md file with testing instructions, including:\n- The URL to test (e.g., http://localhost:3000)\n- What features or behaviors to test\n- Any login credentials or setup steps`,
          )
          setState('error')
          return
        }

        const instructions = await readFile(fs.instructions, 'utf-8')

        if (cancelledRef.current) return

        // Launch browser and create agent
        setState('launching-browser')
        setProgress('Launching browser...')

        const agent = await createBrowserTestAgent({
          model,
          instructions,
          browserStatePath: fs.browserState,
          onProgress: addLog,
          onBrowserClosed: () => {
            if (!cancelledRef.current) {
              cancelledRef.current = true
              setState('browser-closed')
            }
          },
        })

        agentRef.current = agent

        if (cancelledRef.current) {
          await agent.close()
          return
        }

        // Run initial prompt
        setState('running-agent')
        setProgress('Agent starting...')

        const result = await agent.run(
          'Navigate to the URL specified in the instructions and stop. Report that you are ready and waiting for further instructions.',
        )

        if (cancelledRef.current) {
          await agent.close()
          return
        }

        setAgentResponse(result.response)
        setState('waiting-for-input')
      } catch (err) {
        if (cancelledRef.current) return

        const message =
          err instanceof Error ? err.message : 'Failed to start browser test'
        setError(message)
        setState('error')
      }
    }

    void run()

    return () => {
      cancelledRef.current = true
      if (agentRef.current) {
        void agentRef.current.close()
      }
    }
  }, [addLog])

  // Handle user input
  useInput(
    (input, key) => {
      if (state === 'waiting-for-input') {
        if (key.return) {
          // User pressed Enter
          const prompt = userInput.trim()

          if (
            prompt.toLowerCase() === 'exit' ||
            prompt.toLowerCase() === 'quit'
          ) {
            // User wants to exit
            setState('exiting')
            if (agentRef.current) {
              void agentRef.current.close().then(() => {
                exit()
              })
            } else {
              exit()
            }
            return
          }

          // Continue agent with user input
          const continuePrompt =
            prompt ||
            'Continue testing based on the code changes and your observations.'

          setState('running-agent')
          setProgress('Agent working...')
          setUserInput('')

          if (agentRef.current) {
            void agentRef.current
              .run(continuePrompt)
              .then((result) => {
                if (cancelledRef.current) return

                setAgentResponse(result.response)
                setState('waiting-for-input')
              })
              .catch((err) => {
                if (cancelledRef.current) return

                const message =
                  err instanceof Error ? err.message : 'Agent error'
                setError(message)
                setState('error')
              })
          }
        } else if (key.backspace || key.delete) {
          setUserInput((prev) => prev.slice(0, -1))
        } else if (key.escape) {
          // User pressed Escape - exit
          setState('exiting')
          if (agentRef.current) {
            void agentRef.current.close().then(() => {
              exit()
            })
          } else {
            exit()
          }
        } else if (input && !key.ctrl && !key.meta) {
          setUserInput((prev) => prev + input)
        }
      }
    },
    { isActive: isRawModeSupported && state === 'waiting-for-input' },
  )

  // Auto-exit on error after delay
  useEffect(() => {
    if (state === 'error') {
      const timer = setTimeout(() => {
        process.exitCode = 1
        exit()
      }, 100)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [state, exit])

  // Auto-exit when browser is closed by user
  useEffect(() => {
    if (state === 'browser-closed') {
      const timer = setTimeout(() => {
        exit()
      }, 1500)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [state, exit])

  return (
    <Box flexDirection="column">
      <Jumbo />
      <Header kanji="試験" title="Browser Test" />

      {/* Progress/Status */}
      {(state === 'initializing' ||
        state === 'checking-instructions' ||
        state === 'launching-browser' ||
        state === 'running-agent') && (
        <Box marginTop={1} gap={1}>
          <Text color="red">
            <Spinner type="dots" />
          </Text>
          <Text color="grey">{progress}</Text>
        </Box>
      )}

      {/* Logs */}
      {logs.length > 0 && state === 'running-agent' && (
        <Box marginTop={1} flexDirection="column">
          {logs.slice(-5).map((log, i) => (
            <Text key={i} color="grey" dimColor>
              {log}
            </Text>
          ))}
        </Box>
      )}

      {/* Agent Response */}
      {agentResponse && state === 'waiting-for-input' && (
        <Box marginTop={1} flexDirection="column">
          <Box marginBottom={1}>
            <Text color="green" bold>
              Agent:
            </Text>
          </Box>
          <Box paddingLeft={2}>
            <Text>{renderMarkdown(agentResponse)}</Text>
          </Box>
        </Box>
      )}

      {/* Input Prompt */}
      {state === 'waiting-for-input' && (
        <Box marginTop={1} flexDirection="column">
          <Box marginBottom={1}>
            <Text color="grey">
              Press Enter to continue, type instructions, or type "exit" to
              quit.
            </Text>
          </Box>
          <Box>
            <Text color="cyan">→ </Text>
            <Text>{userInput}</Text>
            <Text color="grey">▋</Text>
          </Box>
        </Box>
      )}

      {/* Error */}
      {state === 'error' && error && (
        <Box marginTop={1} flexDirection="column">
          <Text color="red">{error}</Text>
        </Box>
      )}

      {/* Exiting */}
      {state === 'exiting' && (
        <Box marginTop={1}>
          <Text color="grey">Closing browser...</Text>
        </Box>
      )}

      {/* Browser closed by user */}
      {state === 'browser-closed' && (
        <Box marginTop={1} flexDirection="column">
          <Text color="yellow">Browser was closed.</Text>
          <Text color="grey">
            Run `kyoto test` again to start a new session.
          </Text>
        </Box>
      )}
    </Box>
  )
}
