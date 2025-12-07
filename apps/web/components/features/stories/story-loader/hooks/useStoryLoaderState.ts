import { useEffect, useState } from 'react'

import { type Story } from '../types'

interface UseStoryLoaderStateProps {
  initialStory?: Story | null
}

export function useStoryLoaderState({
  initialStory,
}: UseStoryLoaderStateProps) {
  // Error state
  const [error, setError] = useState<string | null>(null)

  // Story data states - initialize from server data if available
  const [story, setStory] = useState<Story | null>(initialStory ?? null)

  // Story form state
  const [storyName, setStoryName] = useState(initialStory?.name ?? '')
  const [storyContent, setStoryContent] = useState(initialStory?.story ?? '')
  const [originalStoryContent, setOriginalStoryContent] = useState(
    initialStory?.story ?? '',
  )
  const [originalStoryName, setOriginalStoryName] = useState(
    initialStory?.name ?? '',
  )

  // UI state (dialogs and flags)
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false)
  const [createMore, setCreateMore] = useState(false)

  // Action states
  const [isSaving, setIsSaving] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [isTogglingState, setIsTogglingState] = useState(false)
  const [isDecomposing, setIsDecomposing] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationRunId, setGenerationRunId] = useState<string | null>(null)
  const [generationAccessToken, setGenerationAccessToken] = useState<
    string | null
  >(null)

  // Derived values
  const hasContentChanges = storyContent !== originalStoryContent
  const hasNameChanges = storyName !== originalStoryName
  const hasChanges = hasContentChanges || hasNameChanges

  // Update form state when initialStory changes (from server)
  useEffect(() => {
    if (initialStory) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing server data to form state
      setStory(initialStory)
      setStoryName(initialStory.name)
      setOriginalStoryName(initialStory.name)
      setStoryContent(initialStory.story)
      setOriginalStoryContent(initialStory.story)
    }
  }, [initialStory])

  return {
    // Error state
    error,
    setError,

    // Story data
    story,
    setStory,

    // Form state
    storyName,
    setStoryName,
    storyContent,
    setStoryContent,
    originalStoryContent,
    setOriginalStoryContent,
    originalStoryName,
    setOriginalStoryName,

    // UI state
    showArchiveDialog,
    setShowArchiveDialog,
    showTemplatesDialog,
    setShowTemplatesDialog,
    createMore,
    setCreateMore,

    // Action states
    isSaving,
    setIsSaving,
    isArchiving,
    setIsArchiving,
    isTogglingState,
    setIsTogglingState,
    isDecomposing,
    setIsDecomposing,
    isTesting,
    setIsTesting,
    isGenerating,
    setIsGenerating,
    generationRunId,
    setGenerationRunId,
    generationAccessToken,
    setGenerationAccessToken,

    // Derived values
    hasContentChanges,
    hasNameChanges,
    hasChanges,
  }
}
