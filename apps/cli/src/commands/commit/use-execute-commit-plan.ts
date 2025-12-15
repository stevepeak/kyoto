import { useState } from 'react'

import { type CommitPlan } from './commit-plan'
import { executeCommitPlan } from './execute-commit-plan'

interface UseExecuteCommitPlanOptions {
  plan: CommitPlan
  gitRoot: string
  onComplete: () => void
  onError: (error: string) => void
  onExit: () => void
}

interface UseExecuteCommitPlanReturn {
  isExecuting: boolean
  progress: string
  currentOrder: number | null
  completedOrders: number[]
  execute: () => Promise<void>
}

export function useExecuteCommitPlan({
  plan,
  gitRoot,
  onComplete,
  onError,
  onExit,
}: UseExecuteCommitPlanOptions): UseExecuteCommitPlanReturn {
  const [isExecuting, setIsExecuting] = useState(false)
  const [progress, setProgress] = useState<string>('')
  const [currentOrder, setCurrentOrder] = useState<number | null>(null)
  const [completedOrders, setCompletedOrders] = useState<number[]>([])

  const execute = async (): Promise<void> => {
    setIsExecuting(true)

    try {
      await executeCommitPlan({
        gitRoot,
        plan,
        onProgress: (message) => {
          setProgress(message)
        },
        onStepStart: ({ order }) => {
          setCurrentOrder(order)
        },
        onStepComplete: ({ order }) => {
          setCompletedOrders((prev) => [...prev, order])
        },
      })
      setIsExecuting(false)
      setCurrentOrder(null)
      setProgress('Done.')

      await new Promise((resolve) => {
        setTimeout(() => {
          resolve(undefined)
        }, 250)
      })
      onComplete()
      onExit()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to execute commit plan'
      setIsExecuting(false)
      process.exitCode = 1
      onError(message)

      await new Promise((resolve) => {
        setTimeout(() => {
          resolve(undefined)
        }, 2000)
      })
      onExit()
    }
  }

  return {
    isExecuting,
    progress,
    currentOrder,
    completedOrders,
    execute,
  }
}
