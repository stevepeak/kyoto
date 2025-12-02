'use client'

import { AppLayout } from '@/components/layout'
import { StoryArchiveDialog } from '@/components/apps/story-archive-dialog'
import { StoryTemplatesDialog } from '@/components/apps/story-templates-dialog'
import { StoryCreateForm } from '@/components/apps/story-create-form'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  VisuallyHidden,
} from '@/components/ui/dialog'
import { useHotkeys } from 'react-hotkeys-hook'
import { useStoryLoaderState } from './hooks/useStoryLoaderState'
import { useStoryActions } from './hooks/useStoryActions'
import { useStoryGeneration } from './hooks/useStoryGeneration'
import { StoryLoaderTabs } from './components/StoryLoaderTabs'
import { StoryGenerationTracking } from './components/StoryGenerationTracking'
import type { StoryLoaderClientProps } from './types'

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
    setShowGenerationDialog: state.setShowGenerationDialog,
  })

  // Generation logic
  const generation = useStoryGeneration({
    generationRunId: state.generationRunId,
    generationAccessToken: state.generationAccessToken,
    showGenerationDialog: state.showGenerationDialog,
    setIsGenerating: state.setIsGenerating,
    setGenerationRunId: state.setGenerationRunId,
    setGenerationAccessToken: state.setGenerationAccessToken,
    setShowGenerationDialog: state.setShowGenerationDialog,
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
      <Dialog
        open={state.showGenerationDialog}
        onOpenChange={generation.handleGenerationDialogChange}
      >
        <DialogContent className="max-w-lg !left-[50%] !top-[50%] !bottom-auto !translate-x-[-50%] !translate-y-[-50%] data-[state=closed]:!slide-out-to-bottom data-[state=open]:!slide-in-from-bottom data-[state=closed]:!zoom-out-100 data-[state=open]:!zoom-in-100 data-[state=closed]:!fade-out-0 data-[state=open]:!fade-in-0 sm:rounded-lg">
          <VisuallyHidden>
            <DialogTitle>Story Generation</DialogTitle>
            <DialogDescription>
              Track the progress of your story generation
            </DialogDescription>
          </VisuallyHidden>
          <StoryGenerationTracking
            runId={state.generationRunId}
            publicAccessToken={state.generationAccessToken}
            onComplete={generation.handleGenerationComplete}
            onClose={() => generation.handleGenerationDialogChange(false)}
          />
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
