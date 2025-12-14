import {
  analyzeBrowserTestSuggestions,
  type BrowserTestSuggestion,
} from '@app/agents'
import { getScopeContext } from '@app/shell'
import { type ScopeContext, type VibeCheckScope } from '@app/types'
import { type LanguageModel } from 'ai'
import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useEffect,
  useRef,
} from 'react'

import { type Stage, type TestStatus } from './types'

type UseEvaluationOptions = {
  stage: Stage
  changedFiles: string[]
  modelRef: RefObject<LanguageModel | null>
  gitRootRef: RefObject<string | null>
  log: (text: string, opts?: { color?: string; dim?: boolean }) => void
  addDivider: () => void
  setStage: (stage: Stage) => void
  setTestStatuses: Dispatch<SetStateAction<Record<string, TestStatus>>>
  setHighlightedIndex: (index: number) => void
  setCustomInput: (input: string) => void
}

export function useEvaluation(options: UseEvaluationOptions) {
  const {
    stage,
    changedFiles,
    modelRef,
    gitRootRef,
    log,
    addDivider,
    setStage,
    setTestStatuses,
    setHighlightedIndex,
    setCustomInput,
  } = options

  const evaluationAbortRef = useRef<AbortController | null>(null)
  const lastEvaluatedFilesRef = useRef<string>('')

  // Trigger evaluation when files change
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

    if (stage.type === 'awaiting-input') {
      log('New file changes detected, re-analyzing...', { color: 'yellow' })
    }

    addDivider()
    log(`${changedFiles.length} file(s) changed`)
    setStage({ type: 'evaluating' })
  }, [stage.type, changedFiles, addDivider, log, setStage])

  // Handle evaluation when entering evaluating stage
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

      log('Analyzing changes...', { dim: true })

      try {
        const scope: VibeCheckScope = { type: 'changes' }
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

    const handleTestsFound = (tests: BrowserTestSuggestion[]) => {
      log(`Found ${tests.length} suggested test(s)`)
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
    log,
    setStage,
    setTestStatuses,
    setHighlightedIndex,
    setCustomInput,
  ])

  // Re-trigger evaluation if files change during evaluation
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
  }, [stage.type, changedFiles, log, setStage])

  return {
    lastEvaluatedFilesRef,
  }
}
