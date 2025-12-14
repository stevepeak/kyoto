import { Box, Text } from 'ink'
import Spinner from 'ink-spinner'
import React from 'react'

import { type Stage, type TestStatus } from './types'

type StageIndicatorProps = {
  stage: Stage
  testStatuses: Record<string, TestStatus>
  isExiting: boolean
}

export function StageIndicator({
  stage,
  testStatuses,
  isExiting,
}: StageIndicatorProps): React.ReactElement {
  if (isExiting) {
    return <Text dimColor>Ending session...</Text>
  }

  switch (stage.type) {
    case 'initializing':
      return <InitializingIndicator text={stage.text} />
    case 'waiting':
      return <WaitingIndicator />
    case 'evaluating':
      return <EvaluatingIndicator />
    case 'executing':
      return (
        <ExecutingIndicator tests={stage.tests} testStatuses={testStatuses} />
      )
    case 'awaiting-input':
      // Test plan selector is rendered separately
      return <></>
  }
}

function InitializingIndicator({
  text = 'Initializing...',
}: {
  text?: string
}): React.ReactElement {
  return (
    <Box gap={1}>
      <Text color="yellow">
        <Spinner type="dots" />
      </Text>
      <Text>{text}</Text>
    </Box>
  )
}

function WaitingIndicator(): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Box gap={1}>
        <Text color="cyan">👀</Text>
        <Text dimColor>Watching for changes...</Text>
      </Box>
      <Text dimColor>Press q or Escape to exit</Text>
    </Box>
  )
}

function EvaluatingIndicator(): React.ReactElement {
  return (
    <Box gap={1}>
      <Text color="yellow">
        <Spinner type="dots" />
      </Text>
      <Text>Analyzing changes...</Text>
    </Box>
  )
}

type ExecutingIndicatorProps = {
  tests: { id: string; description: string }[]
  testStatuses: Record<string, TestStatus>
}

function ExecutingIndicator({
  tests,
  testStatuses,
}: ExecutingIndicatorProps): React.ReactElement {
  const visibleTests = tests.filter((t) => {
    const status = testStatuses[t.id]
    return (
      status === 'selected' ||
      status === 'running' ||
      status === 'pass' ||
      status === 'fail'
    )
  })

  return (
    <Box flexDirection="column">
      <Box gap={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text>Running tests...</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        {visibleTests.map((test) => {
          const status = testStatuses[test.id] ?? 'pending'
          return (
            <Box key={test.id} gap={1}>
              <Text
                color={
                  status === 'running'
                    ? 'yellow'
                    : status === 'pass'
                      ? 'green'
                      : status === 'fail'
                        ? 'red'
                        : 'grey'
                }
              >
                {status === 'running'
                  ? '◐'
                  : status === 'pass'
                    ? '✓'
                    : status === 'fail'
                      ? '✗'
                      : '○'}
              </Text>
              <Text dimColor={status === 'pass' || status === 'fail'}>
                {test.description}
              </Text>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
