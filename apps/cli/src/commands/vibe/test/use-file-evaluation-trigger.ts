import { pluralize } from '@app/utils'
import { type MutableRefObject, useEffect } from 'react'

import { type Stage } from './types'

type UseFileEvaluationTriggerOptions = {
  stage: Stage
  changedFiles: string[]
  lastEvaluatedFilesRef: MutableRefObject<string>
  clearStream: () => void
  log: (text: string, opts?: { color?: string; dim?: boolean }) => void
  setStage: (stage: Stage) => void
}

/**
 * Watches for file changes and triggers evaluation when files change.
 * Only triggers from 'waiting' or 'awaiting-input' stages.
 */
export function useFileEvaluationTrigger(
  options: UseFileEvaluationTriggerOptions,
): void {
  const {
    stage,
    changedFiles,
    lastEvaluatedFilesRef,
    clearStream,
    log,
    setStage,
  } = options

  useEffect(() => {
    // Only trigger from waiting or awaiting-input stages
    if (stage.type !== 'waiting' && stage.type !== 'awaiting-input') {
      return
    }

    if (changedFiles.length === 0) {
      return
    }

    // Check if files have actually changed since last evaluation
    const currentFilesKey = [...changedFiles].sort().join(',')
    if (currentFilesKey === lastEvaluatedFilesRef.current) {
      return
    }

    // Files changed - start evaluation
    lastEvaluatedFilesRef.current = currentFilesKey

    // Clear previous logs when starting a new evaluation cycle
    clearStream()

    log(
      `${changedFiles.length} ${pluralize(changedFiles.length, 'file')} changed`,
    )
    setStage({ type: 'evaluating' })
  }, [
    stage.type,
    changedFiles,
    lastEvaluatedFilesRef,
    clearStream,
    log,
    setStage,
  ])
}
