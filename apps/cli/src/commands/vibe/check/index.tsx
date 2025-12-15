import { type AgentRunState } from '@app/types'
import { Box, Text, useInput } from 'ink'
import React, { Fragment, useMemo } from 'react'

import { defaultVibeCheckAgents } from '../../../agents'
import { IssueSelection } from '../../../helpers/display/issue-selection'
import { VibeAgents } from '../../../helpers/display/vibe-agents'
import { consolidateFindings } from '../../../helpers/vibe-check/findings'
import { useVibeCheck } from '../../../helpers/vibe-check/use-vibe-check'
import { Header } from '../../../ui/header'
import { Jumbo } from '../../../ui/jumbo'
import { ScopeDisplay } from '../../../ui/ScopeDisplay'

interface VibeCheckProps {
  staged?: boolean
  timeoutMinutes?: number
  commitCount?: number
  commitSha?: string
  sinceBranch?: string
  last?: boolean
}

function WarningsDisplay({
  warnings,
}: {
  warnings: React.ReactNode[]
}): React.ReactElement | null {
  if (warnings.length === 0) {
    return null
  }

  return (
    <Box marginTop={1} flexDirection="column">
      {warnings.map((warning, index) => (
        <Fragment key={index}>{warning}</Fragment>
      ))}
    </Box>
  )
}

function AgentsStep({
  context,
  timeoutMinutes,
  onComplete,
}: {
  context: NonNullable<ReturnType<typeof useVibeCheck>['context']>
  timeoutMinutes: number
  onComplete: ReturnType<typeof useVibeCheck>['handleAgentComplete']
}): React.ReactElement {
  return (
    <VibeAgents
      agents={defaultVibeCheckAgents}
      context={context}
      onComplete={onComplete}
      timeoutMinutes={timeoutMinutes}
    />
  )
}

function IssuesStep({
  finalStates,
  onSelect,
  onExit,
}: {
  finalStates: NonNullable<ReturnType<typeof useVibeCheck>['finalStates']>
  onSelect: ReturnType<typeof useVibeCheck>['handleIssueSelect']
  onExit: ReturnType<typeof useVibeCheck>['handleExit']
}): React.ReactElement {
  return (
    <IssueSelection
      agentStates={finalStates}
      onSelect={onSelect}
      onExit={onExit}
    />
  )
}

function hasIssues(states: AgentRunState[]): boolean {
  return consolidateFindings(states).length > 0
}

export default function VibeCheck({
  staged = false,
  timeoutMinutes = 1,
  commitCount,
  commitSha,
  sinceBranch,
  last,
}: VibeCheckProps): React.ReactElement {
  const {
    step,
    warnings,
    error,
    context,
    finalStates,
    scopeDescription,
    handleAgentComplete,
    handleIssueSelect,
    handleExit,
  } = useVibeCheck({
    staged,
    timeoutMinutes,
    commitCount,
    commitSha,
    sinceBranch,
    last,
  })

  const issuesExist = useMemo(
    () => finalStates && hasIssues(finalStates),
    [finalStates],
  )

  const showIssueSelection = step === 'issues' && issuesExist
  const showNoIssuesMessage = step === 'issues' && !issuesExist

  // Handle "q" to exit when no issues are found
  useInput(
    (input) => {
      if (input === 'q' || input === 'Q') {
        handleExit()
      }
    },
    { isActive: showNoIssuesMessage },
  )

  return (
    <Box flexDirection="column">
      <Jumbo />
      <ScopeDisplay scopeDescription={scopeDescription} />
      <Header kanji="空気" title="Vibe checks" />

      <WarningsDisplay warnings={warnings} />

      {context && (
        <AgentsStep
          context={context}
          timeoutMinutes={timeoutMinutes}
          onComplete={handleAgentComplete}
        />
      )}

      {showNoIssuesMessage && (
        <Box marginTop={1}>
          <Text color="green">No issues found. All checks passed!</Text>
        </Box>
      )}

      {showIssueSelection && finalStates && (
        <IssuesStep
          finalStates={finalStates}
          onSelect={handleIssueSelect}
          onExit={handleExit}
        />
      )}

      {error && <Text color="red">{error}</Text>}
    </Box>
  )
}
