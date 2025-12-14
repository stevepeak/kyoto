import { findGitRoot } from '@app/shell'
import { useApp } from 'ink'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  type BrowserTestAgent,
  createBrowserTestAgent,
} from '../../agents/test-browser'
import { init } from '../../helpers/init'
import type { Stage } from './types'

type UseBrowserAgentOptions = {
  log: (text: string, opts?: { color?: string; dim?: boolean }) => void
  addAgentMessage: (text: string) => void
  addDivider: () => void
  setStage: (stage: Stage) => void
}

type InitResult = Awaited<ReturnType<typeof init>>

export function useBrowserAgent(options: UseBrowserAgentOptions) {
  const { log, addAgentMessage, addDivider, setStage } = options
  const { exit } = useApp()

  const agentRef = useRef<BrowserTestAgent | null>(null)
  const cancelledRef = useRef(false)
  const hasInitializedRef = useRef(false)
  const modelRef = useRef<InitResult['model'] | null>(null)
  const gitRootRef = useRef<string | null>(null)

  const [isExiting, setIsExiting] = useState(false)

  const close = useCallback(async () => {
    setIsExiting(true)
    if (agentRef.current) {
      await agentRef.current.close()
    }
    exit()
  }, [exit])

  useEffect(() => {
    if (hasInitializedRef.current) return
    hasInitializedRef.current = true
    cancelledRef.current = false

    const run = async (): Promise<void> => {
      try {
        setStage({ type: 'initializing', text: 'Initializing...' })

        const { fs, model } = await init()
        modelRef.current = model
        gitRootRef.current = await findGitRoot()

        if (cancelledRef.current) return

        log('Checking for instructions...')

        if (!existsSync(fs.instructions)) {
          log(`No instructions file found at ${fs.instructions}`, {
            color: 'red',
          })
          log(
            'Create a .kyoto/instructions.md file with testing instructions',
            { dim: true },
          )
          setStage({ type: 'waiting' })
          setTimeout(() => {
            process.exitCode = 1
            exit()
          }, 100)
          return
        }

        const instructions = await readFile(fs.instructions, 'utf-8')
        log('Found instructions.md')

        if (cancelledRef.current) return

        setStage({ type: 'initializing', text: 'Launching browser...' })
        log('Launching browser...')

        const agent = await createBrowserTestAgent({
          model,
          instructions,
          browserStatePath: fs.browserState,
          onProgress: (msg) => log(msg, { dim: true }),
          onBrowserClosed: () => {
            if (!cancelledRef.current) {
              cancelledRef.current = true
              log('Browser was closed', { color: 'yellow' })
              setTimeout(() => exit(), 1500)
            }
          },
        })

        agentRef.current = agent

        if (cancelledRef.current) {
          await agent.close()
          return
        }

        setStage({ type: 'initializing', text: 'Navigating to test URL...' })
        log('Navigating to test URL...')

        const result = await agent.run(
          'Navigate to the URL specified in the instructions and stop. Report that you are ready and waiting for further instructions.',
        )

        if (cancelledRef.current) {
          await agent.close()
          return
        }

        addAgentMessage(result.response)
        addDivider()
        log('Ready. Watching for file changes...', { color: 'cyan' })
        setStage({ type: 'waiting' })
      } catch (err) {
        if (cancelledRef.current) return
        const message =
          err instanceof Error ? err.message : 'Failed to start browser test'
        log(message, { color: 'red' })
        setStage({ type: 'waiting' })
        setTimeout(() => {
          process.exitCode = 1
          exit()
        }, 100)
      }
    }

    void run()

    return () => {
      cancelledRef.current = true
    }
  }, [log, addAgentMessage, addDivider, setStage, exit])

  return {
    agent: agentRef.current,
    agentRef,
    model: modelRef.current,
    modelRef,
    gitRoot: gitRootRef.current,
    gitRootRef,
    cancelledRef,
    isExiting,
    close,
  }
}
