import { useCallback } from 'react'
import type { StoryDiscoveryOutput } from '../types'

interface UseStoryGenerationProps {
  setIsGenerating: (value: boolean) => void
  setGenerationRunId: (value: string | null) => void
  setGenerationAccessToken: (value: string | null) => void
  setStoryContent: (value: string) => void
  setStoryName: (value: string) => void
  setError: (value: string | null) => void
}

interface UseStoryGenerationReturn {
  handleGenerationComplete: (output: StoryDiscoveryOutput) => void
}

export function useStoryGeneration({
  setIsGenerating,
  setGenerationRunId,
  setGenerationAccessToken,
  setStoryContent,
  setStoryName,
  setError,
}: UseStoryGenerationProps): UseStoryGenerationReturn {
  // Extract story from output and update state
  const handleStoryOutput = useCallback(
    (output: StoryDiscoveryOutput) => {
      if (output?.stories && output.stories.length > 0) {
        const generatedStory = output.stories[0]
        setStoryContent(generatedStory.text)
        if (generatedStory.title) {
          setStoryName(generatedStory.title)
        }
      } else {
        setError('No story was generated')
      }
    },
    [setStoryContent, setStoryName, setError],
  )

  // Output is handled by StoryGenerationTracking component
  // No need to call useTriggerRun here since StoryGenerationTracking handles it

  // Handle story generation completion (called from StoryGenerationTracking)
  const handleGenerationComplete = useCallback(
    (output: StoryDiscoveryOutput) => {
      if (output) {
        handleStoryOutput(output)
      } else {
        setError('Story generation is still processing')
      }
      // Clean up
      setIsGenerating(false)
      setGenerationRunId(null)
      setGenerationAccessToken(null)
    },
    [
      handleStoryOutput,
      setIsGenerating,
      setGenerationRunId,
      setGenerationAccessToken,
      setError,
    ],
  )

  return {
    handleGenerationComplete,
  }
}
