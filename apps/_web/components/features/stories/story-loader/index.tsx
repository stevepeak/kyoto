'use client'

import { useHotkeys } from 'react-hotkeys-hook'

import { StoryArchiveDialog } from '@/components/features/stories/story-archive-dialog'
import { StoryCreateForm } from '@/components/features/stories/story-create-form'
import { StoryTemplatesDialog } from '@/components/features/stories/story-templates-dialog'
import { AppLayout } from '@/components/layout'

import { StoryGenerationTracking } from './components/StoryGenerationTracking'
import { StoryLoaderTabs } from './components/StoryLoaderTabs'
import { useStoryActions } from './hooks/useStoryActions'
import { useStoryGeneration } from './hooks/useStoryGeneration'
import { useStoryLoaderState } from './hooks/useStoryLoaderState'
import { type StoryLoaderClientProps } from './types'

export function StoryLoaderClient({
  orgName,
  repoName,
  storyId,
  initialStory,
}: StoryLoaderClientProps) {
  const isCreateMode = !storyId

  // State management
  const state = useStoryLoaderState({ initialStory })

  // Actions
  const actions = useStoryActions({
    orgName,
    repoName,
    storyId,
    isCreateMode,
    storyName: state.storyName,
    storyContent: state.storyContent,
    originalStoryContent: state.originalStoryContent,
    originalStoryName: state.originalStoryName,
    hasContentChanges: state.hasContentChanges,
    hasNameChanges: state.hasNameChanges,
    createMore: state.createMore,
    setStory: state.setStory,
    setStoryName: state.setStoryName,
    setStoryContent: state.setStoryContent,
    setOriginalStoryContent: state.setOriginalStoryContent,
    setOriginalStoryName: state.setOriginalStoryName,
    setCreateMore: state.setCreateMore,
    setError: state.setError,
    setIsSaving: state.setIsSaving,
    setIsArchiving: state.setIsArchiving,
    setIsTogglingState: state.setIsTogglingState,
    setIsDecomposing: state.setIsDecomposing,
    setIsTesting: state.setIsTesting,
    setIsGenerating: state.setIsGenerating,
    setGenerationRunId: state.setGenerationRunId,
    setGenerationAccessToken: state.setGenerationAccessToken,
  })

  // Generation logic
  const generation = useStoryGeneration({
    setIsGenerating: state.setIsGenerating,
    setGenerationRunId: state.setGenerationRunId,
    setGenerationAccessToken: state.setGenerationAccessToken,
    setStoryContent: state.setStoryContent,
    setStoryName: state.setStoryName,
    setError: state.setError,
  })

  // Keyboard shortcuts
  // Handle Cmd/Ctrl+Enter for save
  useHotkeys(
    'mod+enter',
    (event) => {
      // Prevent default to stop TipTap from inserting newline
      event.preventDefault()
      event.stopPropagation()
      if (!state.isSaving && (isCreateMode || state.hasChanges)) {
        void actions.handleSave()
      }
    },
    {
      preventDefault: true,
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
  )

  const breadcrumbs = [
    { label: orgName, href: `/org/${orgName}` },
    { label: repoName, href: `/org/${orgName}/repo/${repoName}` },
  ]

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <style>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .shimmer-effect {
          animation: shimmer 3s infinite;
        }
      `}</style>
      {state.error && (
        <div className="mx-6 mt-4 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          {state.error}
        </div>
      )}
      {isCreateMode || state.story ? (
        <div className="flex flex-col h-full overflow-hidden">
          <div className="flex flex-1 overflow-hidden flex-col">
            {!isCreateMode ? (
              <StoryLoaderTabs
                story={state.story}
                storyName={state.storyName}
                storyContent={state.storyContent}
                hasChanges={state.hasChanges}
                isSaving={state.isSaving}
                isDecomposing={state.isDecomposing}
                isTesting={state.isTesting}
                isTogglingState={state.isTogglingState}
                onNameChange={state.setStoryName}
                onContentChange={state.setStoryContent}
                onSave={actions.handleSave}
                onCancel={actions.handleCancel}
                onArchive={() => state.setShowArchiveDialog(true)}
                onPause={() => actions.handleToggleState('paused')}
                onDecompose={actions.handleDecompose}
                onTest={actions.handleTest}
                onToggleState={actions.handleToggleState}
                onApproveGenerated={actions.handleApproveGenerated}
              />
            ) : (
              <StoryCreateForm
                storyContent={state.storyContent}
                createMore={state.createMore}
                isSaving={state.isSaving}
                isGenerating={state.isGenerating}
                onContentChange={state.setStoryContent}
                onCreateMoreChange={state.setCreateMore}
                onSave={actions.handleSave}
                onCancel={actions.handleCancel}
                onTemplates={() => state.setShowTemplatesDialog(true)}
                onGenerate={actions.handleGenerate}
              />
            )}
          </div>
        </div>
      ) : null}
      <StoryTemplatesDialog
        open={state.showTemplatesDialog}
        onOpenChange={state.setShowTemplatesDialog}
        onSelectTemplate={(content) => {
          state.setStoryContent(content)
        }}
      />
      <StoryArchiveDialog
        open={state.showArchiveDialog}
        onOpenChange={state.setShowArchiveDialog}
        isArchiving={state.isArchiving}
        onArchive={actions.handleArchive}
      />
      <StoryGenerationTracking
        runId={state.generationRunId}
        publicAccessToken={state.generationAccessToken}
        onComplete={generation.handleGenerationComplete}
        onError={(error) => {
          state.setError(error instanceof Error ? error.message : String(error))
          state.setIsGenerating(false)
          state.setGenerationRunId(null)
          state.setGenerationAccessToken(null)
        }}
      />
    </AppLayout>
  )
}
