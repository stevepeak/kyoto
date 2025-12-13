import { type AgentRunState, type VibeCheckSeverity } from '@app/types'
import { Box, Text, useInput } from 'ink'
import SelectInput from 'ink-select-input'
import React, { useMemo, useState } from 'react'

import { Header } from '../../ui/header'
import {
  type ConsolidatedFinding,
  consolidateFindings,
  getFindingId,
  sortFindingsByPriority,
} from '../vibe-check/findings'

interface IssueSelectionProps {
  agentStates: AgentRunState[]
  onSelect: (finding: ConsolidatedFinding) => Promise<void>
  onExit: () => void
}

interface FindingItem {
  label: string
  value: string
  finding: ConsolidatedFinding
}

function formatSeverity(severity: VibeCheckSeverity): string {
  return severity.toUpperCase()
}

function formatFindingLabel(finding: ConsolidatedFinding): string {
  const severity = formatSeverity(finding.severity)
  const pathPart = finding.path ? ` (${finding.path})` : ''
  return `[${severity}] ${finding.message}${pathPart}`
}

function CustomItem({
  isSelected,
  finding,
  isStarted,
}: {
  isSelected: boolean
  finding: ConsolidatedFinding
  isStarted: boolean
}): React.ReactElement {
  const severityColor =
    finding.severity === 'error'
      ? 'red'
      : finding.severity === 'warn'
        ? 'yellow'
        : 'blue'

  return (
    <Box flexDirection="row" gap={1}>
      <Text
        bold={isSelected && !isStarted}
        color={isSelected && !isStarted ? 'cyan' : undefined}
        dimColor={isStarted || !isSelected}
        strikethrough={isStarted}
      >
        <Text color={isStarted ? 'grey' : severityColor}>
          [{formatSeverity(finding.severity)}]
        </Text>{' '}
        {finding.message}
        {finding.path && <Text dimColor> ({finding.path})</Text>}
        {isStarted && <Text color="green"> ✓</Text>}
      </Text>
    </Box>
  )
}

export function IssueSelection({
  agentStates,
  onSelect,
  onExit,
}: IssueSelectionProps): React.ReactElement {
  // Consolidate and sort findings
  const allFindings = useMemo(() => {
    const consolidated = consolidateFindings(agentStates)
    const sorted = sortFindingsByPriority(consolidated)
    // Limit to top 20 issues to keep UI manageable
    return sorted.slice(0, 20)
  }, [agentStates])

  // Track which findings have been started (struck through)
  const [startedIds, setStartedIds] = useState<Set<string>>(new Set())

  // Create items for SelectInput (filter out started items)
  const items: FindingItem[] = useMemo(
    () =>
      allFindings
        .filter((finding) => !startedIds.has(getFindingId(finding)))
        .map((finding) => ({
          label: formatFindingLabel(finding),
          value: getFindingId(finding),
          finding,
        })),
    [allFindings, startedIds],
  )

  // Create items for all findings (including started ones) for display
  const allItems: FindingItem[] = useMemo(
    () =>
      allFindings.map((finding) => ({
        label: formatFindingLabel(finding),
        value: getFindingId(finding),
        finding,
      })),
    [allFindings],
  )

  const handleSelect = async (item: FindingItem): Promise<void> => {
    // Mark as started immediately
    setStartedIds((prev) => new Set(prev).add(item.value))

    // Spawn agent for this finding (don't await, let it run in background)
    void onSelect(item.finding)
  }

  // Handle "q" to exit
  useInput((input, key) => {
    if (input === 'q' || input === 'Q') {
      onExit()
    }
  })

  if (allFindings.length === 0) {
    return (
      <Box flexDirection="column" marginTop={1}>
        <Header kanji="行" title="Take Action" />
        <Box width="80%">
          <Text color="grey">No issues found. All checks passed!</Text>
        </Box>
      </Box>
    )
  }

  if (items.length === 0 && allFindings.length > 0) {
    // All issues have been started
    return (
      <Box flexDirection="column" marginTop={1}>
        <Header kanji="行" title="Take Action" />
        <Box width="80%" flexDirection="column" marginTop={1}>
          <Text color="green">
            All issues have been started! Press "q" to exit.
          </Text>
          <Box marginTop={1} flexDirection="column">
            {allItems
              .filter((item) => startedIds.has(item.value))
              .map((item) => (
                <CustomItem
                  key={item.value}
                  isSelected={false}
                  finding={item.finding}
                  isStarted={true}
                />
              ))}
          </Box>
        </Box>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      <Header kanji="行" title="Take Action" />
      <Box width="80%" flexDirection="column" marginTop={1}>
        <Text color="grey">
          Select an issue to fix. Use arrow keys to navigate, Enter to start
          agent. Press "q" to exit.
        </Text>
        <Box marginTop={1} flexDirection="column">
          {/* Show started items first (struck through) */}
          {allItems
            .filter((item) => startedIds.has(item.value))
            .map((item) => (
              <Box key={item.value} marginLeft={2}>
                <CustomItem
                  isSelected={false}
                  finding={item.finding}
                  isStarted={true}
                />
              </Box>
            ))}
          {/* Show selectable items */}
          {items.length > 0 && (
            <Box
              marginTop={
                allItems.filter((item) => startedIds.has(item.value)).length > 0
                  ? 1
                  : 0
              }
            >
              <SelectInput
                items={items}
                onSelect={handleSelect}
                itemComponent={(props) => {
                  const item = items.find((i) => i.value === props.value)
                  if (!item) {
                    return null
                  }
                  return (
                    <CustomItem
                      isSelected={props.isSelected}
                      finding={item.finding}
                      isStarted={false}
                    />
                  )
                }}
              />
            </Box>
          )}
        </Box>
        <Box marginTop={1}>
          <Text color="grey">
            {startedIds.size > 0
              ? `${startedIds.size} issue${startedIds.size === 1 ? '' : 's'} started. ${items.length} remaining.`
              : `${items.length} issue${items.length === 1 ? '' : 's'} available.`}
          </Text>
        </Box>
      </Box>
    </Box>
  )
}
