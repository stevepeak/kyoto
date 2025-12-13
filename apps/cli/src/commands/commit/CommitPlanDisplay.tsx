import { Box, Text } from 'ink'
import React from 'react'

import { type CommitPlan } from '../../helpers/commit/commit-plan'

interface CommitPlanDisplayProps {
  plan: CommitPlan
  currentOrder: number | null
  completedOrders: number[]
}

export function CommitPlanDisplay({
  plan,
  currentOrder,
  completedOrders,
}: CommitPlanDisplayProps): React.ReactElement {
  if (plan.steps.length === 0) {
    return (
      <Box marginTop={1}>
        <Text color="grey">No commit plan available.</Text>
      </Box>
    )
  }

  return (
    <>
      <Box marginTop={1} flexDirection="column">
        <Text bold>Commit Plan</Text>
        <Text color="gray">Review the plan below. Commit now?</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        {plan.steps
          .sort((a, b) => a.order - b.order)
          .map((step, index) => {
            const isComplete = completedOrders.includes(step.order)
            const isCurrent = currentOrder === step.order
            const badge = isComplete ? '✓' : isCurrent ? '→' : ' '
            const badgeColor: 'green' | 'yellow' | 'gray' = isComplete
              ? 'green'
              : isCurrent
                ? 'yellow'
                : 'gray'

            return (
              <Box
                key={index}
                marginTop={index > 0 ? 1 : 0}
                flexDirection="column"
                paddingX={1}
                borderStyle="round"
                borderColor="blue"
              >
                <Box marginBottom={1}>
                  <Text color={badgeColor}>{badge} </Text>
                  <Text bold color="cyan">
                    Commit {step.order}: {step.commitMessage}
                  </Text>
                </Box>
                {step.reasoning && (
                  <Box marginBottom={1}>
                    <Text color="gray">{step.reasoning}</Text>
                  </Box>
                )}
                <Box flexDirection="column" marginTop={1}>
                  <Text color="yellow" bold>
                    Files to stage:
                  </Text>
                  {step.files.map((file, fileIndex) => (
                    <Box key={fileIndex} marginLeft={2}>
                      <Text> • {file}</Text>
                    </Box>
                  ))}
                </Box>
              </Box>
            )
          })}
      </Box>
    </>
  )
}
