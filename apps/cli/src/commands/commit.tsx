import { Box, Text, useApp } from 'ink'
import Spinner from 'ink-spinner'
import React, { useEffect, useState } from 'react'

import { type CommitPlan } from '../helpers/commit/commit-plan'
import {
  readCommitPlanFile,
  writeCommitPlanFile,
} from '../helpers/commit/commit-plan-file'
import { createCommitPlan } from '../helpers/commit/create-commit-plan'
import { executeCommitPlan } from '../helpers/commit/execute-commit-plan'
import { init } from '../helpers/init'
import { Jumbo } from '../ui/jumbo'

interface CommitProps {
  plan?: boolean
  instructions?: string
}

export default function Commit({
  plan: shouldOnlyPlan = false,
  instructions,
}: CommitProps): React.ReactElement {
  const { exit } = useApp()
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<string>('Initializing...')
  const [error, setError] = useState<string | null>(null)
  const [commitPlanPath, setCommitPlanPath] = useState<string | null>(null)
  const [plan, setPlan] = useState<CommitPlan | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [currentOrder, setCurrentOrder] = useState<number | null>(null)
  const [completedOrders, setCompletedOrders] = useState<number[]>([])

  useEffect(() => {
    let cancelled = false

    const runStage = async (): Promise<void> => {
      try {
        const { git, model, fs } = await init()
        setCommitPlanPath(fs.commitPlan)

        // Check if there are any changes
        if (!git.hasChanges) {
          setError('No uncommitted changes found.')
          setLoading(false)
          await new Promise((resolve) => {
            setTimeout(() => {
              resolve(undefined)
            }, 2000)
          })
          if (!cancelled) {
            exit()
          }
          return
        }

        if (shouldOnlyPlan) {
          setProgress('Analyzing uncommitted changes...')
          const newPlan = await createCommitPlan({
            model,
            instructions,
            onProgress: (message) => {
              if (!cancelled) {
                setProgress(message)
              }
            },
          })

          await writeCommitPlanFile({
            commitPlanPath: fs.commitPlan,
            plan: newPlan,
          })

          if (!cancelled) {
            setPlan(newPlan)
            setLoading(false)

            // Auto-exit after showing results
            await new Promise((resolve) => {
              setTimeout(() => {
                resolve(undefined)
              }, 150)
            })
            if (!cancelled) {
              exit()
            }
          }
          return
        }

        let loadedPlan: CommitPlan | null = null

        if (instructions) {
          setProgress('Instructions provided; creating a new commit plan...')
          loadedPlan = await createCommitPlan({
            model,
            instructions,
            onProgress: (message) => {
              if (!cancelled) {
                setProgress(message)
              }
            },
          })
          await writeCommitPlanFile({
            commitPlanPath: fs.commitPlan,
            plan: loadedPlan,
          })
        } else {
          setProgress('Loading commit plan...')
          loadedPlan = await readCommitPlanFile({
            commitPlanPath: fs.commitPlan,
          })

          if (!loadedPlan) {
            setProgress('No commit plan found; creating one...')
            loadedPlan = await createCommitPlan({
              model,
              onProgress: (message) => {
                if (!cancelled) {
                  setProgress(message)
                }
              },
            })
            await writeCommitPlanFile({
              commitPlanPath: fs.commitPlan,
              plan: loadedPlan,
            })
          }
        }

        if (cancelled) {
          return
        }

        setPlan(loadedPlan)
        setLoading(false)
        setIsExecuting(true)

        await executeCommitPlan({
          gitRoot: fs.gitRoot,
          plan: loadedPlan,
          onProgress: (message) => {
            if (!cancelled) {
              setProgress(message)
            }
          },
          onStepStart: ({ order }) => {
            if (!cancelled) {
              setCurrentOrder(order)
            }
          },
          onStepComplete: ({ order }) => {
            if (!cancelled) {
              setCompletedOrders((prev) => [...prev, order])
            }
          },
        })

        if (!cancelled) {
          setIsExecuting(false)
          setCurrentOrder(null)
          setProgress('Done.')

          await new Promise((resolve) => {
            setTimeout(() => {
              resolve(undefined)
            }, 250)
          })

          exit()
        }
      } catch (err) {
        if (cancelled) {
          return
        }

        const message =
          err instanceof Error
            ? err.message
            : 'Failed to analyze staging suggestions'
        setError(message)
        setLoading(false)
        process.exitCode = 1

        await new Promise((resolve) => {
          setTimeout(() => {
            resolve(undefined)
          }, 2000)
        })

        if (!cancelled) {
          exit()
        }
      }
    }

    void runStage()

    return () => {
      cancelled = true
    }
  }, [exit, instructions, shouldOnlyPlan])

  if (loading) {
    return (
      <Box flexDirection="column">
        <Jumbo />
        <Box marginTop={1} gap={1}>
          <Text color="red">
            <Spinner type="dots" />
          </Text>
          <Text>{progress}</Text>
        </Box>
      </Box>
    )
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Jumbo />
        <Box marginTop={1}>
          <Text color="red">{error}</Text>
        </Box>
      </Box>
    )
  }

  if (!plan || plan.steps.length === 0) {
    return (
      <Box flexDirection="column">
        <Jumbo />
        <Box marginTop={1}>
          <Text color="grey">No commit plan available.</Text>
        </Box>
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      <Jumbo />
      {commitPlanPath && (
        <Box marginTop={1}>
          <Text color="gray">Plan file: {commitPlanPath}</Text>
        </Box>
      )}
      {isExecuting && (
        <Box marginTop={1} gap={1}>
          <Text color="red">
            <Spinner type="dots" />
          </Text>
          <Text>{progress}</Text>
        </Box>
      )}
      <Box marginTop={1} flexDirection="column">
        <Text bold>
          {shouldOnlyPlan ? 'Commit Plan' : 'Commit Plan (executing)'}
        </Text>
        <Text color="gray">
          {shouldOnlyPlan
            ? 'Saved to .kyoto/commit-plan.json. Run kyoto commit to execute.'
            : 'Executing commits in sequential order:'}
        </Text>
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
    </Box>
  )
}
