import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useTRPCClient } from '@/client/trpc'
import type { Story } from '../types'

interface UseStoryActionsProps {
  orgName: string
  repoName: string
  storyId?: string
  isCreateMode: boolean
  storyName: string
  storyContent: string
  originalStoryContent: string
  originalStoryName: string
  hasContentChanges: boolean
  hasNameChanges: boolean
  createMore: boolean
  setStory: (story: Story | null) => void
  setStoryName: (name: string) => void
  setStoryContent: (content: string) => void
  setOriginalStoryContent: (content: string) => void
  setOriginalStoryName: (name: string) => void
  setCreateMore: (value: boolean) => void
  setError: (error: string | null) => void
  setIsSaving: (value: boolean) => void
  setIsArchiving: (value: boolean) => void
  setIsTogglingState: (value: boolean) => void
  setIsDecomposing: (value: boolean) => void
  setIsTesting: (value: boolean) => void
  setIsGenerating: (value: boolean) => void
  setGenerationRunId: (value: string | null) => void
  setGenerationAccessToken: (value: string | null) => void
  setShowGenerationDialog: (value: boolean) => void
}

export function useStoryActions({
  orgName,
  repoName,
  storyId,
  isCreateMode,
  storyName,
  storyContent,
  originalStoryContent,
  originalStoryName,
  hasContentChanges,
  hasNameChanges,
  createMore,
  setStory,
  setStoryName,
  setStoryContent,
  setOriginalStoryContent,
  setOriginalStoryName,
  setCreateMore: _setCreateMore,
  setError,
  setIsSaving,
  setIsArchiving,
  setIsTogglingState,
  setIsDecomposing,
  setIsTesting,
  setIsGenerating,
  setGenerationRunId,
  setGenerationAccessToken,
  setShowGenerationDialog,
}: UseStoryActionsProps) {
  const trpc = useTRPCClient()
  const router = useRouter()

  const handleSave = async () => {
    if (!storyContent.trim()) {
      setError('Story content is required')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      if (isCreateMode) {
        await trpc.story.create.mutate({
          orgName,
          repoName,
          name: storyName.trim() || undefined,
          story: storyContent,
        })
      } else {
        // Build update payload with only changed fields
        if (!storyId) {
          return
        }

        const updatePayload: {
          orgName: string
          repoName: string
          storyId: string
          name?: string
          story?: string
        } = {
          orgName,
          repoName,
          storyId,
        }

        // Only include fields that have changed
        if (hasNameChanges) {
          updatePayload.name = storyName
        }
        if (hasContentChanges) {
          updatePayload.story = storyContent
        }

        const result = await trpc.story.update.mutate(updatePayload)
        setStory(result.story as Story)
        setOriginalStoryContent(storyContent)
        setOriginalStoryName(storyName)
        setIsSaving(false)
        return
      }

      // If "create more" is checked, reset the form and stay on the page
      if (createMore) {
        setStoryContent('')
        setStoryName('')
        setOriginalStoryContent('')
        setOriginalStoryName('')
        setIsSaving(false)
        toast.success('Story created.')
        return // Early return to prevent any navigation
      }

      // Otherwise, navigate back to the repository page
      router.push(`/org/${orgName}/repo/${repoName}`)
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : isCreateMode
            ? 'Failed to create story'
            : 'Failed to update story',
      )
      setIsSaving(false)
    }
  }

  const handleGenerate = async () => {
    if (!isCreateMode) {
      return // Only allow generation in create mode
    }

    setIsGenerating(true)
    setError(null)
    // Open the dialog immediately
    setShowGenerationDialog(true)

    try {
      const result = await trpc.story.generate.mutate({
        orgName,
        repoName,
      })

      if (result.triggerHandle?.publicAccessToken && result.triggerHandle?.id) {
        // Set the run ID and token to enable the hook
        // The dialog is already open and will update when these are set
        setGenerationRunId(result.triggerHandle.id)
        setGenerationAccessToken(result.triggerHandle.publicAccessToken)
        // Keep isGenerating true while dialog is open - don't set to false here
      } else {
        throw new Error('Failed to get trigger handle')
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Failed to generate story. Please try again.',
      )
      toast.error('Failed to generate story')
      setIsGenerating(false)
      // Close the dialog on error
      setShowGenerationDialog(false)
      setGenerationRunId(null)
      setGenerationAccessToken(null)
    }
  }

  const handleCancel = () => {
    if (isCreateMode) {
      // Don't clear draft on cancel - user might come back
      window.history.back()
    } else {
      setStoryContent(originalStoryContent)
      setStoryName(originalStoryName)
    }
  }

  const handleArchive = async () => {
    if (!storyId) {
      return
    }
    setIsArchiving(true)
    setError(null)
    try {
      await trpc.story.toggleState.mutate({
        orgName,
        repoName,
        storyId: storyId,
        state: 'archived',
      })
      router.push(`/org/${orgName}/repo/${repoName}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to archive story')
      setIsArchiving(false)
    }
  }

  const handleToggleState = async (newState: 'active' | 'paused') => {
    if (!storyId) {
      return
    }
    setIsTogglingState(true)
    setError(null)
    try {
      const result = await trpc.story.toggleState.mutate({
        orgName,
        repoName,
        storyId: storyId,
        state: newState,
      })
      if (result.story) {
        setStory(result.story as Story)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to toggle story state')
    } finally {
      setIsTogglingState(false)
    }
  }

  const handleDecompose = async () => {
    if (!storyId) {
      return
    }
    setIsDecomposing(true)
    setError(null)
    try {
      await trpc.story.decompose.mutate({
        storyId: storyId,
      })
      // Reload story to get updated decomposition
      const resp = await trpc.story.get.query({
        orgName,
        repoName,
        storyId: storyId,
      })
      if (resp.story) {
        setStory(resp.story as Story)
        setStoryName(resp.story.name)
        setOriginalStoryName(resp.story.name)
        setStoryContent(resp.story.story)
        setOriginalStoryContent(resp.story.story)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start decomposition')
    } finally {
      setIsDecomposing(false)
    }
  }

  const handleTest = async () => {
    if (!storyId) {
      return
    }
    setIsTesting(true)
    setError(null)
    try {
      await trpc.story.test.mutate({
        storyId: storyId,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start test')
    } finally {
      setIsTesting(false)
    }
  }

  const handleApproveGenerated = async () => {
    if (!storyId) {
      return
    }
    setIsDecomposing(true)
    setError(null)
    try {
      // Trigger decomposition workflow (task will set state to processing)
      await trpc.story.decompose.mutate({
        storyId: storyId,
      })
      // Navigate back to repos page
      router.push(`/org/${orgName}/repo/${repoName}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to approve story')
      setIsDecomposing(false)
    }
  }

  return {
    handleSave,
    handleGenerate,
    handleCancel,
    handleArchive,
    handleToggleState,
    handleDecompose,
    handleTest,
    handleApproveGenerated,
  }
}
