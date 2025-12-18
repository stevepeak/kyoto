'use client'

import { Kanji } from '@/components/display/kanji'
import { RunsLayout } from '@/components/stories/runs-layout'
import { StoriesSidebar } from '@/components/stories/stories-sidebar'
import { StoryHeader } from '@/components/stories/story-header'
import { useBrowserAgentsPage } from '@/hooks/stories/use-browser-agents-page'

export function AgentsPage() {
  const {
    activeTab,
    setActiveTab,
    selectedStoryId,
    setSelectedStoryId,
    selectedRunId,
    setSelectedRunId,
    editedName,
    editedInstructions,
    editedScheduleText,
    editedCronSchedule,
    hasUnsavedChanges,
    isCreatingNewStory,
    stories,
    runs,
    isRunning,
    selectedRun,
    nextScheduledRun,
    isStoriesLoading,
    isStoryLoading,
    isCreating,
    isSaving,
    isDeleting,
    isParsing,
    parseError,
    handleCreateStory,
    handleSave,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    showDeleteDialog,
    handleScheduleTextChange,
    handleScheduleBlur,
    handleTrigger,
    handleInstructionsChange,
    handleNameChange,
  } = useBrowserAgentsPage()

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      <StoriesSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stories={stories}
        selectedStoryId={selectedStoryId}
        setSelectedStoryId={setSelectedStoryId}
        isStoriesLoading={isStoriesLoading}
        isCreating={isCreating}
        onCreateStory={handleCreateStory}
      />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {selectedStoryId ? (
          <>
            <StoryHeader
              editedName={editedName}
              hasUnsavedChanges={hasUnsavedChanges}
              isSaving={isSaving}
              isRunning={isRunning}
              isDeleting={isDeleting}
              isCreatingNewStory={isCreatingNewStory}
              showDeleteDialog={showDeleteDialog}
              onNameChange={handleNameChange}
              onSave={handleSave}
              onTrigger={handleTrigger}
              onDeleteClick={handleDeleteClick}
              onDeleteConfirm={handleDeleteConfirm}
              onDeleteCancel={handleDeleteCancel}
            />

            <RunsLayout
              selectedRun={selectedRun ?? null}
              runs={runs}
              isStoryLoading={isStoryLoading}
              selectedRunId={selectedRunId}
              nextScheduledRun={nextScheduledRun}
              editedInstructions={editedInstructions}
              editedScheduleText={editedScheduleText}
              editedCronSchedule={editedCronSchedule}
              isParsing={isParsing}
              parseError={parseError}
              onRunSelect={setSelectedRunId}
              onInstructionsChange={handleInstructionsChange}
              onScheduleTextChange={handleScheduleTextChange}
              onScheduleBlur={handleScheduleBlur}
            />
          </>
        ) : activeTab === 'stories' ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="max-w-md text-center">
              <Kanji title="Sakusei - to create." className="mb-2">
                さくせい
              </Kanji>
              <h2 className="text-xl font-semibold">User Story Testing</h2>
              <p className="mt-2 text-muted-foreground">
                Write <b>natural language stories</b> that describe critical
                user journeys. Kyoto runs these as automated sanity checks on
                your production app, catching issues before your users do.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="max-w-md text-center">
              <Kanji title="Sakusei - to create." className="mb-2">
                さくせい
              </Kanji>
              <h2 className="mt-4 text-xl font-semibold">Integrations</h2>
              <p className="mt-2 text-muted-foreground">
                Connect external services to receive notifications when your
                stories run. Add webhooks to send run results to your own
                endpoints.
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                Add an integration from the sidebar to get started.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
