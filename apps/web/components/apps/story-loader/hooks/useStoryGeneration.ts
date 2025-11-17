import { useCallback } from 'react'
import { toast } from 'sonner'
import { useTriggerRun } from '@/hooks/use-trigger-run'
import type { StoryDiscoveryOutput } from '../types'

interface UseStoryGenerationProps {
  generationRunId: string | null
  generationAccessToken: string | null
  isGenerating: boolean
  setIsGenerating: (value: boolean) => void
  setGenerationRunId: (value: string | null) => void
  setGenerationAccessToken: (value: string | null) => void
  setShowGenerationDialog: (value: boolean) => void
  setStoryContent: (value: string) => void
  setStoryName: (value: string) => void
  setError: (value: string | null) => void
}

interface UseStoryGenerationReturn {
  generationRun: ReturnType<typeof useTriggerRun<StoryDiscoveryOutput>>['run']
  generationError: ReturnType<typeof useTriggerRun<StoryDiscoveryOutput>>['error']
  handleGenerationComplete: () => void
  handleGenerationDialogChange: (open: boolean) => void
}

export function useStoryGeneration({
  generationRunId,
  generationAccessToken,
  isGenerating: _isGenerating,
  setIsGenerating,
  setGenerationRunId,
  setGenerationAccessToken,
  setShowGenerationDialog,
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
        toast.success('Story generated successfully')
      } else {
        setError('No story was generated')
        toast.error('No story was generated')
      }
    },
    [setStoryContent, setStoryName, setError],
  )

  // Use the reusable trigger run hook
  const { run: generationRun, error: generationError, output } =
    useTriggerRun<StoryDiscoveryOutput>({
      runId: generationRunId,
      publicAccessToken: generationAccessToken,
      onComplete: (result) => {
        handleStoryOutput(result)
        // Clean up
        setIsGenerating(false)
        setGenerationRunId(null)
        setGenerationAccessToken(null)
        setShowGenerationDialog(false)
      },
      onError: (error) => {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to generate story'
        setError(errorMessage)
        toast.error('Failed to generate story')
        setIsGenerating(false)
        setGenerationRunId(null)
        setGenerationAccessToken(null)
        setShowGenerationDialog(false)
      },
    })

  // Handle story generation completion (called from dialog)
  const handleGenerationComplete = useCallback(() => {
    if (output) {
      handleStoryOutput(output)
    } else {
      setError('Story generation is still processing')
    }
    // Clean up
    setIsGenerating(false)
    setGenerationRunId(null)
    setGenerationAccessToken(null)
    setShowGenerationDialog(false)
  }, [
    output,
    handleStoryOutput,
    setIsGenerating,
    setGenerationRunId,
    setGenerationAccessToken,
    setShowGenerationDialog,
    setError,
  ])

  // Handle dialog close (manual or on completion)
  const handleGenerationDialogChange = useCallback(
    (open: boolean) => {
      setShowGenerationDialog(open)
      if (!open) {
        // If dialog is closed manually, clean up
        setIsGenerating(false)
        setGenerationRunId(null)
        setGenerationAccessToken(null)
      }
    },
    [
      setShowGenerationDialog,
      setIsGenerating,
      setGenerationRunId,
      setGenerationAccessToken,
    ],
  )

  return {
    generationRun,
    generationError,
    handleGenerationComplete,
    handleGenerationDialogChange,
  }
}
