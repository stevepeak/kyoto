import { useMemo } from 'react'

import { type RunStory, type StoryTestResult } from '../../types'
import { getDisplayStatus } from '../../utils'
import { parseDecomposition } from '../DecompositionParser'

interface UseStoryAnalysisResult {
  analysis: StoryTestResult['analysis'] | null
  decomposition: ReturnType<typeof parseDecomposition> | null
  displayStatus: ReturnType<typeof getDisplayStatus>
  isRunning: boolean
  showDecompositionLoading: boolean
}

/**
 * Hook to parse and analyze story data including decomposition and test results
 */
export function useStoryAnalysis(
  story: RunStory,
  testResult: StoryTestResult | null,
): UseStoryAnalysisResult {
  return useMemo(() => {
    const analysis = testResult?.analysis ?? null
    const displayStatus = getDisplayStatus(story)
    const isRunning = displayStatus === 'running'
    const decomposition = parseDecomposition(story.story?.composition)
    const showDecompositionLoading =
      (!testResult || isRunning) && decomposition !== null

    return {
      analysis,
      decomposition,
      displayStatus,
      isRunning,
      showDecompositionLoading,
    }
  }, [story, testResult])
}
