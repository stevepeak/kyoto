import { type MutableRefObject, useEffect } from 'react'

import { type Stage } from './types'

type UseEvaluationRestartOptions = {
  stage: Stage
  changedFiles: string[]
  lastEvaluatedFilesRef: MutableRefObject<string>
  evaluationAbortRef: MutableRefObject<AbortController | null>
  log: (text: string, opts?: { color?: string; dim?: boolean }) => void
  setStage: (stage: Stage) => void
}

/**
 * Handles re-triggering evaluation when files change during an active evaluation.
 * Aborts the current evaluation and restarts with the new file set.
 */
export function useEvaluationRestart(
  options: UseEvaluationRestartOptions,
): void {
  const {
    stage,
    changedFiles,
    lastEvaluatedFilesRef,
    evaluationAbortRef,
    log,
    setStage,
  } = options

  useEffect(() => {
    if (stage.type !== 'evaluating') {
      return
    }

    if (changedFiles.length === 0) {
      return
    }

    const currentFilesKey = [...changedFiles].sort().join(',')
    if (currentFilesKey !== lastEvaluatedFilesRef.current) {
      // Files changed during evaluation - abort and restart
      lastEvaluatedFilesRef.current = currentFilesKey
      log('Files changed, restarting analysis...', {
        color: 'yellow',
        dim: true,
      })

      // Abort current evaluation
      if (evaluationAbortRef.current) {
        evaluationAbortRef.current.abort()
      }

      // Re-trigger by toggling stage
      setStage({ type: 'waiting' })
      // Use setTimeout to allow state to settle before re-entering evaluating
      setTimeout(() => {
        setStage({ type: 'evaluating' })
      }, 0)
    }
  }, [
    stage.type,
    changedFiles,
    lastEvaluatedFilesRef,
    evaluationAbortRef,
    log,
    setStage,
  ])
}
