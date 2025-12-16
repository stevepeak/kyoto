import { Box, useInput, useStdin } from 'ink'
import React, { useEffect, useRef, useState } from 'react'

import { Header } from '../../../ui/header'
import { Jumbo } from '../../../ui/jumbo'
import { StageIndicator } from './stage-indicator'
import { StreamDisplay } from './stream-display'
import { TestPlanSelector } from './test-plan-selector'
import { type Stage, type TestStatus } from './types'
import { useBrowserAgent } from './use-browser-agent'
import { useEvaluation } from './use-evaluation'
import { useFileWatcher } from './use-file-watcher'
import { useStream } from './use-stream'
import { useTestExecution } from './use-test-execution'

type TestProps = {
  headless?: boolean
  interactive?: boolean
}

export default function Test(props: TestProps): React.ReactElement {
  // Stream of log items
  const {
    stream,
    clearStream,
    log,
    addDivider,
    addAgentMessage,
    addTestResult,
  } = useStream()

  // Current stage
  const [stage, setStage] = useState<Stage>({
    type: 'initializing',
    text: 'Starting...',
  })

  // Test selection state
  const [testStatuses, setTestStatuses] = useState<Record<string, TestStatus>>(
    {},
  )
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [customInput, setCustomInput] = useState('')

  // File watcher - enabled in waiting, evaluating, and awaiting-input stages
  const isWatchingEnabled =
    stage.type === 'waiting' ||
    stage.type === 'evaluating' ||
    stage.type === 'awaiting-input'

  const { changedFiles, reset: resetFileWatcher } = useFileWatcher({
    enabled: isWatchingEnabled,
    debounceMs: 500,
    pollIntervalMs: 1000,
  })

  // Browser agent lifecycle
  const { agentRef, modelRef, gitRootRef, cancelledRef, isExiting, close } =
    useBrowserAgent({
      headless: props.headless,
      log,
      addAgentMessage,
      addDivider,
      setStage,
    })

  // Evaluation handling
  const { lastEvaluatedFilesRef } = useEvaluation({
    stage,
    changedFiles,
    modelRef,
    gitRootRef,
    clearStream,
    log,
    setStage,
    setTestStatuses,
    setHighlightedIndex,
    setCustomInput,
  })

  // Test execution
  const { runTests } = useTestExecution({
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
  })

  // Auto-run tests when not in interactive mode
  const autoRunTriggeredRef = useRef(false)
  const interactive = props.interactive ?? false

  useEffect(() => {
    if (
      !interactive &&
      stage.type === 'awaiting-input' &&
      !autoRunTriggeredRef.current
    ) {
      autoRunTriggeredRef.current = true
      void runTests(stage.tests)
    }

    // Reset the trigger when we leave awaiting-input
    if (stage.type !== 'awaiting-input') {
      autoRunTriggeredRef.current = false
    }
  }, [interactive, stage, runTests])

  // Handle escape to exit
  const { isRawModeSupported } = useStdin()
  useInput(
    (input, key) => {
      if (key.escape || input === 'q' || input === 'Q') {
        void close()
      }
    },
    { isActive: !isExiting && (isRawModeSupported ?? false) },
  )

  // Handle test selection navigation
  const handleNavigate = (direction: 'up' | 'down') => {
    if (stage.type !== 'awaiting-input') return
    const totalItems = stage.tests.length + 1

    if (direction === 'up') {
      setHighlightedIndex((prev) => Math.max(0, prev - 1))
    } else {
      setHighlightedIndex((prev) => Math.min(totalItems - 1, prev + 1))
    }
  }

  const handleToggleTest = (testId: string) => {
    setTestStatuses((prev) => ({
      ...prev,
      [testId]: prev[testId] === 'selected' ? 'pending' : 'selected',
    }))
  }

  const handleSubmit = () => {
    if (stage.type === 'awaiting-input') {
      void runTests(stage.tests)
    }
  }

  return (
    <Box flexDirection="column">
      <Jumbo />
      <Header kanji="試験" title="Vibe testing" />

      <StreamDisplay stream={stream} />

      <Box marginTop={1} flexDirection="column">
        {stage.type === 'awaiting-input' ? (
          <TestPlanSelector
            tests={stage.tests}
            testStatuses={testStatuses}
            highlightedIndex={highlightedIndex}
            customInput={customInput}
            onToggleTest={handleToggleTest}
            onNavigate={handleNavigate}
            onCustomInputChange={setCustomInput}
            onSubmit={handleSubmit}
          />
        ) : (
          <StageIndicator
            stage={stage}
            testStatuses={testStatuses}
            isExiting={isExiting}
          />
        )}
      </Box>
    </Box>
  )
}
