import { type LanguageModel } from 'ai'
import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useRef,
} from 'react'

import { type Stage, type TestStatus } from './types'
import { useEvaluationRestart } from './use-evaluation-restart'
import { useFileEvaluationTrigger } from './use-file-evaluation-trigger'
import { usePerformEvaluation } from './use-perform-evaluation'

type UseEvaluationOptions = {
  stage: Stage
  changedFiles: string[]
  modelRef: RefObject<LanguageModel | null>
  gitRootRef: RefObject<string | null>
  clearStream: () => void
  log: (text: string, opts?: { color?: string; dim?: boolean }) => void
  setStage: (stage: Stage) => void
  setTestStatuses: Dispatch<SetStateAction<Record<string, TestStatus>>>
  setHighlightedIndex: (index: number) => void
  setCustomInput: (input: string) => void
  changes?: { file: string; lines: string }[]
}

/**
 * Orchestrates the evaluation lifecycle by composing three focused hooks:
 * - useFileEvaluationTrigger: Watches for file changes and triggers evaluation
 * - usePerformEvaluation: Runs the browser test suggestions analysis
 * - useEvaluationRestart: Handles mid-evaluation file changes
 */
export function useEvaluation(options: UseEvaluationOptions) {
  const {
    stage,
    changedFiles,
    modelRef,
    gitRootRef,
    clearStream,
    log,
    setStage,
    setTestStatuses,
    setHighlightedIndex,
    setCustomInput,
    changes,
  } = options

  const evaluationAbortRef = useRef<AbortController | null>(null)
  const lastEvaluatedFilesRef = useRef<string>('')

  // Trigger evaluation when files change
  useFileEvaluationTrigger({
    stage,
    changedFiles,
    lastEvaluatedFilesRef,
    clearStream,
    log,
    setStage,
  })

  // Handle evaluation when entering evaluating stage
  usePerformEvaluation({
    stage,
    modelRef,
    gitRootRef,
    evaluationAbortRef,
    log,
    setStage,
    setTestStatuses,
    setHighlightedIndex,
    setCustomInput,
    changes,
  })

  // Re-trigger evaluation if files change during evaluation
  useEvaluationRestart({
    stage,
    changedFiles,
    lastEvaluatedFilesRef,
    evaluationAbortRef,
    log,
    setStage,
  })

  return {
    lastEvaluatedFilesRef,
  }
}
