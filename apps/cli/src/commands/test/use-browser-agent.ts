import { type LanguageModel } from 'ai'
import { useApp } from 'ink'
import { useCallback, useEffect, useRef, useState } from 'react'

import { type BrowserTestAgent } from '../../agents/test-browser'
import { initializeAgent } from '../../helpers/browser-agent-init'
import { type Stage } from './types'

type UseBrowserAgentOptions = {
  headless?: boolean
  log: (text: string, opts?: { color?: string; dim?: boolean }) => void
  addAgentMessage: (text: string) => void
  addDivider: () => void
  setStage: (stage: Stage) => void
}

export function useBrowserAgent(options: UseBrowserAgentOptions) {
  const { headless, log, addAgentMessage, addDivider, setStage } = options
  const { exit } = useApp()

  const agentRef = useRef<BrowserTestAgent | null>(null)
  const cancelledRef = useRef(false)
  const hasInitializedRef = useRef(false)
  const modelRef = useRef<LanguageModel | null>(null)
  const gitRootRef = useRef<string | null>(null)

  const [isExiting, setIsExiting] = useState(false)

  const close = useCallback(async () => {
    setIsExiting(true)
    if (agentRef.current) {
      await agentRef.current.close()
    }
    exit()
  }, [exit])

  // Handle SIGINT (Control-C) to clean up browser
  useEffect(() => {
    const handleSigint = (): void => {
      cancelledRef.current = true
      if (agentRef.current) {
        void agentRef.current.close().finally(() => {
          exit()
        })
      } else {
        exit()
      }
    }

    process.on('SIGINT', handleSigint)
    return () => {
      process.off('SIGINT', handleSigint)
    }
  }, [exit])

  useEffect(() => {
    if (hasInitializedRef.current) return
    hasInitializedRef.current = true
    cancelledRef.current = false

    const run = async (): Promise<void> => {
      setStage({ type: 'initializing', text: 'Initializing...' })

      const result = await initializeAgent({
        headless,
        onProgress: (msg) => log(msg, { dim: true }),
        onBrowserClosed: () => {
          if (!cancelledRef.current) {
            cancelledRef.current = true
            log('Browser was closed', { color: 'yellow' })
            setTimeout(() => exit(), 1500)
          }
        },
      })

      if (cancelledRef.current) {
        if (result.success) {
          await result.agent.close()
        }
        return
      }

      if (!result.success) {
        log(result.error, { color: 'red' })
        if (result.hint) {
          log(result.hint, { dim: true })
        }
        setStage({ type: 'waiting' })
        setTimeout(() => {
          process.exitCode = 1
          exit()
        }, 100)
        return
      }

      // Store refs
      agentRef.current = result.agent
      modelRef.current = result.model
      gitRootRef.current = result.gitRoot

      addAgentMessage(result.initialResponse)
      addDivider()
      log('Ready. Watching for file changes...', { color: 'cyan' })
      setStage({ type: 'waiting' })
    }

    run().catch((err) => {
      if (cancelledRef.current) return
      const message =
        err instanceof Error ? err.message : 'Failed to start browser test'
      log(message, { color: 'red' })
      setStage({ type: 'waiting' })
      setTimeout(() => {
        process.exitCode = 1
        exit()
      }, 100)
    })

    return () => {
      cancelledRef.current = true
    }
  }, [log, addAgentMessage, addDivider, setStage, exit, headless])

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
