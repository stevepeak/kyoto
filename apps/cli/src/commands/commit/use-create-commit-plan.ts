import { useEffect, useState } from 'react'

import { type CommitPlan } from '../../helpers/commit/commit-plan'
import { createCommitPlan } from '../../helpers/commit/create-commit-plan'
import { init } from '../../helpers/init'

interface UseCreateCommitPlanOptions {
  shouldOnlyPlan: boolean
  instructions?: string
  onComplete: (plan: CommitPlan, gitRoot: string) => void
  onError: (error: string) => void
  onExit: () => void
}

interface UseCreateCommitPlanReturn {
  loading: boolean
  progress: string
  plan: CommitPlan | null
  error: string | null
}

export function useCreateCommitPlan({
  shouldOnlyPlan,
  instructions,
  onComplete,
  onError,
  onExit,
}: UseCreateCommitPlanOptions): UseCreateCommitPlanReturn {
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<string>('Initializing...')
  const [error, setError] = useState<string | null>(null)
  const [plan, setPlan] = useState<CommitPlan | null>(null)

  useEffect(() => {
    let cancelled = false

    const runStage = async (): Promise<void> => {
      try {
        const { git, model, fs } = await init()

        // Check if there are any changes
        if (!git.hasChanges) {
          const errorMessage = 'No uncommitted changes found.'
          setError(errorMessage)
          setLoading(false)
          await new Promise((resolve) => {
            setTimeout(() => {
              resolve(undefined)
            }, 2000)
          })
          if (!cancelled) {
            onError(errorMessage)
            onExit()
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

          if (!cancelled) {
            setPlan(newPlan)
            setLoading(false)
            // Auto-exit after showing results (do not save any files)
            await new Promise((resolve) => {
              setTimeout(() => {
                resolve(undefined)
              }, 150)
            })
            if (!cancelled) {
              onExit()
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
        } else {
          setProgress('Creating a commit plan...')
          loadedPlan = await createCommitPlan({
            model,
            onProgress: (message) => {
              if (!cancelled) {
                setProgress(message)
              }
            },
          })
        }

        if (cancelled) {
          return
        }

        // Show plan and ask for confirmation before saving/executing
        setPlan(loadedPlan)
        setLoading(false)
        onComplete(loadedPlan, fs.gitRoot)
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
        onError(message)

        await new Promise((resolve) => {
          setTimeout(() => {
            resolve(undefined)
          }, 200)
        })

        if (!cancelled) {
          onExit()
        }
      }
    }

    void runStage()

    return () => {
      cancelled = true
    }
  }, [shouldOnlyPlan, instructions, onComplete, onError, onExit])

  return {
    loading,
    progress,
    plan,
    error,
  }
}
