import { type BrowserTestSuggestion } from '@app/agents'
import { useApp } from 'ink'
import {
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
  useCallback,
} from 'react'

import { type BrowserTestAgent } from '../../../agents/test-browser'
import { type Stage, type TestStatus } from './types'

type UseTestExecutionOptions = {
  agentRef: MutableRefObject<BrowserTestAgent | null>
  cancelledRef: MutableRefObject<boolean>
  changedFiles: string[]
  testStatuses: Record<string, TestStatus>
  customInput: string
  clearStream: () => void
  log: (text: string, opts?: { color?: string; dim?: boolean }) => void
  addDivider: () => void
  addAgentMessage: (text: string) => void
  addTestResult: (args: {
    description: string
    passed: boolean
    steps: string[]
    response: string
  }) => void
  setStage: (stage: Stage) => void
  setTestStatuses: Dispatch<SetStateAction<Record<string, TestStatus>>>
  setCustomInput: (input: string) => void
  resetFileWatcher: () => void
  lastEvaluatedFilesRef: MutableRefObject<string>
  watch: boolean
}

export function useTestExecution(options: UseTestExecutionOptions) {
  const {
    agentRef,
    cancelledRef,
    changedFiles,
    testStatuses,
    customInput,
    clearStream,
    log,
    addDivider,
    addAgentMessage,
    addTestResult,
    setStage,
    setTestStatuses,
    setCustomInput,
    resetFileWatcher,
    lastEvaluatedFilesRef,
    watch,
  } = options
  const { exit } = useApp()

  const runTests = useCallback(
    async (tests: BrowserTestSuggestion[]) => {
      if (!agentRef.current) return

      const selectedTests = tests.filter(
        (t) => testStatuses[t.id] === 'selected',
      )

      if (selectedTests.length === 0 && !customInput.trim()) {
        log('No tests selected', { dim: true })
        resetFileWatcher()
        lastEvaluatedFilesRef.current = ''

        // If not watching, exit when no tests selected
        if (!watch) {
          log('No tests to run. Exiting...', { color: 'cyan' })
          exit()
        } else {
          setStage({ type: 'waiting' })
        }
        return
      }

      // Clear previous logs when starting execution
      clearStream()
      setStage({ type: 'executing', tests })

      // Reset agent context with fresh test batch info
      agentRef.current.resetContext({
        changedFiles,
        testPlan: selectedTests.map((t) => ({
          description: t.description,
          steps: t.steps,
        })),
      })

      for (const test of selectedTests) {
        if (cancelledRef.current) break

        setTestStatuses((prev) => ({ ...prev, [test.id]: 'running' }))

        try {
          const prompt = `Test the following behavior:\n\n**${test.description}**\n\nSteps:\n${test.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nPerform these steps and report whether the test passes or fails.`

          const result = await agentRef.current.run(prompt)

          if (cancelledRef.current) break

          const passed = result.response.toLowerCase().includes('pass')
          setTestStatuses((prev) => ({
            ...prev,
            [test.id]: passed ? 'pass' : 'fail',
          }))
          addTestResult({
            description: test.description,
            passed,
            steps: test.steps,
            response: result.response,
          })
        } catch (err) {
          setTestStatuses((prev) => ({ ...prev, [test.id]: 'fail' }))
          addTestResult({
            description: test.description,
            passed: false,
            steps: test.steps,
            response: `Error: ${err instanceof Error ? err.message : 'Unknown'}`,
          })
        }
      }

      // Handle custom input
      if (customInput.trim()) {
        log(`Custom: ${customInput}`)
        try {
          const result = await agentRef.current.run(customInput)
          addAgentMessage(result.response)
        } catch (err) {
          log(`Error: ${err instanceof Error ? err.message : 'Unknown'}`, {
            color: 'red',
          })
        }
        setCustomInput('')
      }

      addDivider()
      resetFileWatcher()
      lastEvaluatedFilesRef.current = ''

      // If not watching, exit after tests complete
      if (!watch) {
        log('Tests completed. Exiting...', { color: 'cyan' })
        exit()
      } else {
        setStage({ type: 'waiting' })
      }
    },
    [
      agentRef,
      cancelledRef,
      changedFiles,
      testStatuses,
      customInput,
      clearStream,
      log,
      addDivider,
      addAgentMessage,
      addTestResult,
      setStage,
      setTestStatuses,
      setCustomInput,
      resetFileWatcher,
      lastEvaluatedFilesRef,
      watch,
      exit,
    ],
  )

  return { runTests }
}
