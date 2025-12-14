import { Box, useInput } from 'ink'
import React, { useState } from 'react'

import { Header } from '../../ui/header'
import { Jumbo } from '../../ui/jumbo'
import { StageIndicator } from './stage-indicator'
import { StreamDisplay } from './stream-display'
import { TestPlanSelector } from './test-plan-selector'
import type { Stage, TestStatus } from './types'
import { useBrowserAgent } from './use-browser-agent'
import { useEvaluation } from './use-evaluation'
import { useFileWatcher } from './use-file-watcher'
import { useStream } from './use-stream'
import { useTestExecution } from './use-test-execution'

export default function Test(): React.ReactElement {
  // Stream of log items
  const { stream, log, addDivider, addAgentMessage, addTestResult } =
    useStream()

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
    log,
    addDivider,
    setStage,
    setTestStatuses,
    setHighlightedIndex,
    setCustomInput,
  })

  // Test execution
  const { runTests } = useTestExecution({
    agentRef,
    cancelledRef,
    testStatuses,
    customInput,
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

  // Handle escape to exit
  useInput(
    (input, key) => {
      if (key.escape || input === 'q' || input === 'Q') {
        void close()
      }
    },
    { isActive: !isExiting },
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
      <Header kanji="試験" title="Browser Test" />

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
