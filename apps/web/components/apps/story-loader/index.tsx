'use client'

import { AppLayout } from '@/components/layout'
import { StoryArchiveDialog } from '@/components/apps/story-archive-dialog'
import { StoryTemplatesDialog } from '@/components/apps/story-templates-dialog'
import { StoryCreateForm } from '@/components/apps/story-create-form'
import { TriggerDevTrackingDialog } from '@/components/common/workflow-tracking-dialog'
import { useStoryLoaderState } from './hooks/useStoryLoaderState'
import { useStoryActions } from './hooks/useStoryActions'
import { useStoryKeyboardShortcuts } from './hooks/useStoryKeyboardShortcuts'
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
    isGenerating: state.isGenerating,
    setIsGenerating: state.setIsGenerating,
    setGenerationRunId: state.setGenerationRunId,
    setGenerationAccessToken: state.setGenerationAccessToken,
    setShowGenerationDialog: state.setShowGenerationDialog,
    setStoryContent: state.setStoryContent,
    setStoryName: state.setStoryName,
    setError: state.setError,
  })

  // Keyboard shortcuts
  useStoryKeyboardShortcuts({
    isSaving: state.isSaving,
    isCreateMode,
    hasChanges: state.hasChanges,
    orgName,
    repoName,
    handleSave: actions.handleSave,
  })

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
      <TriggerDevTrackingDialog
        open={state.showGenerationDialog}
        onOpenChange={generation.handleGenerationDialogChange}
        runId={state.generationRunId}
        publicAccessToken={state.generationAccessToken}
        onComplete={generation.handleGenerationComplete}
      >
        <StoryGenerationTracking />
      </TriggerDevTrackingDialog>
    </AppLayout>
  )
}
