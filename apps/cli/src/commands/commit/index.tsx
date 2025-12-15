import { Box, Text, useApp } from 'ink'
import React, { useRef, useState } from 'react'

import { CommandLayout } from '../../ui/command-layout'
import { type CommitPlan } from './commit-plan'
import { CommitPlanDisplay } from './CommitPlanDisplay'
import { ConfirmationInput } from './ConfirmationInput'
import { ExecutionProgress } from './ExecutionProgress'
import { useCreateCommitPlan } from './use-create-commit-plan'
import { useExecuteCommitPlan } from './use-execute-commit-plan'

interface CommitProps {
  instructions?: string
}

export default function Commit({
  instructions,
}: CommitProps): React.ReactElement {
  const { exit } = useApp()
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isInputReady, setIsInputReady] = useState(false)
  const [confirmationError, setConfirmationError] = useState<string | null>(
    null,
  )
  const [executionState, setExecutionState] = useState<{
    plan: CommitPlan
    gitRoot: string
  } | null>(null)
  const pendingPlanRef = useRef<{
    plan: CommitPlan
    gitRoot: string
  } | null>(null)

  const {
    loading: creatingPlan,
    progress: createProgress,
    plan,
    error: createError,
  } = useCreateCommitPlan({
    instructions,
    onComplete: (loadedPlan, gitRoot) => {
      const state = {
        plan: loadedPlan,
        gitRoot,
      }
      pendingPlanRef.current = state
      setExecutionState(state)
      setAwaitingConfirmation(true)
      // Small delay to ensure input is ready
      setTimeout(() => {
        setIsInputReady(true)
      }, 100)
    },
    onError: () => {
      // Error handling is done in the hook
    },
    onExit: () => {
      exit()
    },
  })

  const {
    isExecuting,
    progress: executeProgress,
    currentOrder,
    completedOrders,
    execute,
  } = useExecuteCommitPlan({
    plan: executionState?.plan ?? { version: 1, createdAt: '', steps: [] },
    gitRoot: executionState?.gitRoot ?? '',
    onComplete: () => {
      // Completion handled in hook
    },
    onError: (error) => {
      setConfirmationError(error)
    },
    onExit: () => {
      exit()
    },
  })

  // Show loading or error state during plan creation
  if (creatingPlan || createError) {
    return (
      <CommandLayout
        loading={creatingPlan}
        progress={createProgress}
        error={createError}
      />
    )
  }

  // Show empty state if no plan
  if (!plan || plan.steps.length === 0) {
    return (
      <CommandLayout>
        <CommitPlanDisplay
          plan={plan ?? { version: 1, createdAt: '', steps: [] }}
          currentOrder={null}
          completedOrders={[]}
        />
      </CommandLayout>
    )
  }

  const handleConfirmation = async (value: string): Promise<void> => {
    if (!isInputReady) {
      return
    }

    const normalized = value.trim().toLowerCase()
    const shouldCommit =
      normalized === 'y' || normalized === 'yes' || normalized === ''

    if (shouldCommit) {
      setAwaitingConfirmation(false)
      setConfirmationError(null)

      const pending = pendingPlanRef.current
      if (!pending) {
        exit()
        return
      }

      // Execute the plan
      await execute()
    } else if (normalized === 'n' || normalized === 'no') {
      // User declined - exit without saving
      setAwaitingConfirmation(false)
      exit()
    } else {
      // Invalid input
      setConfirmationError(
        'Please enter "y" for yes or "n" for no (or press Enter for yes)',
      )
    }
  }

  return (
    <CommandLayout>
      {isExecuting && <ExecutionProgress progress={executeProgress} />}
      <CommitPlanDisplay
        plan={plan}
        currentOrder={currentOrder}
        completedOrders={completedOrders}
      />
      {awaitingConfirmation && (
        <ConfirmationInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleConfirmation}
          error={confirmationError}
        />
      )}
      {confirmationError && !awaitingConfirmation && (
        <Box marginTop={1}>
          <Text color="red">{confirmationError}</Text>
        </Box>
      )}
    </CommandLayout>
  )
}
