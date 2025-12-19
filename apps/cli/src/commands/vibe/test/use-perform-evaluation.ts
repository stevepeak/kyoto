import {
  analyzeBrowserTestSuggestions,
  type BrowserTestSuggestion,
} from '@app/agents'
import { getScopeContext } from '@app/shell'
import { type ScopeContext, type VibeCheckScope } from '@app/types'
import { pluralize } from '@app/utils'
import { type LanguageModel } from 'ai'
import {
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
  useEffect,
} from 'react'

import { type Stage, type TestStatus } from './types'

type UsePerformEvaluationOptions = {
  stage: Stage
  modelRef: RefObject<LanguageModel | null>
  gitRootRef: RefObject<string | null>
  evaluationAbortRef: MutableRefObject<AbortController | null>
  log: (text: string, opts?: { color?: string; dim?: boolean }) => void
  setStage: (stage: Stage) => void
  setTestStatuses: Dispatch<SetStateAction<Record<string, TestStatus>>>
  setHighlightedIndex: (index: number) => void
  setCustomInput: (input: string) => void
  changes?: { file: string; lines: string }[]
}

/**
 * Runs the browser test suggestions analysis when entering the 'evaluating' stage.
 * Handles abort logic for cancelling evaluations.
 */
export function usePerformEvaluation(
  options: UsePerformEvaluationOptions,
): void {
  const {
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
  } = options

  useEffect(() => {
    if (stage.type !== 'evaluating') {
      return
    }

    // Cancel any previous evaluation
    if (evaluationAbortRef.current) {
      evaluationAbortRef.current.abort()
    }

    const abortController = new AbortController()
    evaluationAbortRef.current = abortController

    const evaluate = async (): Promise<void> => {
      if (!modelRef.current || !gitRootRef.current) {
        setStage({ type: 'waiting' })
        return
      }

      try {
        // Use file-lines scope if changes provided, otherwise use 'changes' type
        const scope: VibeCheckScope =
          changes && changes.length > 0
            ? { type: 'file-lines', changes }
            : { type: 'changes' }
        const scopeContent: ScopeContext = await getScopeContext(
          scope,
          gitRootRef.current,
        )

        // Check if aborted
        if (abortController.signal.aborted) return

        const result = await analyzeBrowserTestSuggestions({
          context: {
            gitRoot: gitRootRef.current,
            scope,
            scopeContent,
            model: modelRef.current,
          },
          options: {
            progress: (msg) => {
              if (!abortController.signal.aborted) {
                log(msg, { dim: true })
              }
            },
          },
        })

        // Check if aborted
        if (abortController.signal.aborted) return

        if (result.tests.length === 0) {
          log('No tests suggested for these changes')
          setStage({ type: 'waiting' })
        } else {
          handleTestsFound(result.tests)
        }
      } catch (err) {
        if (abortController.signal.aborted) return
        log(
          `Analysis error: ${err instanceof Error ? err.message : 'Unknown'}`,
          { color: 'red' },
        )
        setStage({ type: 'waiting' })
      }
    }

    const handleTestsFound = (tests: BrowserTestSuggestion[]): void => {
      log(`Found ${tests.length} suggested ${pluralize(tests.length, 'test')}`)
      // Pre-select all tests
      const statuses: Record<string, TestStatus> = {}
      for (const test of tests) {
        statuses[test.id] = 'selected'
      }
      setTestStatuses(statuses)
      setHighlightedIndex(0)
      setCustomInput('')
      setStage({ type: 'awaiting-input', tests })
    }

    void evaluate()

    return () => {
      abortController.abort()
    }
  }, [
    stage.type,
    modelRef,
    gitRootRef,
    evaluationAbortRef,
    log,
    setStage,
    setTestStatuses,
    setHighlightedIndex,
    setCustomInput,
    changes,
  ])
}
