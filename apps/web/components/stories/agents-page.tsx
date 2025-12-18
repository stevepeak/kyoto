'use client'

import { type Story } from '@app/schemas'
import { Globe, Loader2, Play, Plus, Terminal, Trash2 } from 'lucide-react'

import { Kanji } from '@/components/display/kanji'
import {
  RunDetailsPanel,
  RunSidebar,
  StoryEditor,
} from '@/components/stories/agents'
import { IntegrationsPanel } from '@/components/stories/integrations-panel'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'
import { useBrowserAgentsPage } from '@/hooks/use-browser-agents-page'
import { cn } from '@/lib/utils'

// UUID for temporary unsaved stories (must match the one in use-browser-agents-page.ts)
const TEMP_STORY_ID = '00000000-0000-0000-0000-000000000001'

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
      {/* Left sidebar */}
      <div className="w-72 flex-shrink-0 border-r bg-muted/30">
        <div className="flex h-full flex-col">
          {/* Tab navigation */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('stories')}
              className={cn(
                'flex-1 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === 'stories'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Stories
            </button>
            <button
              onClick={() => setActiveTab('integrations')}
              className={cn(
                'flex-1 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === 'integrations'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Integrations
            </button>
          </div>

          {activeTab === 'stories' ? (
            <>
              <div className="border-b p-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      disabled={isCreating}
                      className="w-full"
                      variant="outline"
                    >
                      {isCreating ? <Spinner /> : <Plus className="size-4" />}
                      New Story
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64">
                    <DropdownMenuItem
                      onClick={() => handleCreateStory('browser')}
                      className="flex cursor-pointer items-start gap-3 p-3"
                    >
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
                        <Globe className="size-4" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="font-medium">Browser Test</div>
                        <div className="text-xs text-muted-foreground">
                          Test web apps with AI browser agent
                        </div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleCreateStory('vm')}
                      className="flex cursor-pointer items-start gap-3 p-3"
                    >
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                        <Terminal className="size-4" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="font-medium">Virtual Machine</div>
                        <div className="text-xs text-muted-foreground">
                          Test CLI, API, SDK, or MCP servers from a virtual
                          machine.
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex-1 overflow-auto p-2">
                {isStoriesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner />
                  </div>
                ) : stories.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No stories yet
                  </div>
                ) : (
                  <div className="space-y-1">
                    {stories.map((story: Story) => {
                      const isTemp = story.id === TEMP_STORY_ID
                      return (
                        <button
                          key={story.id}
                          onClick={() => setSelectedStoryId(story.id)}
                          className={cn(
                            'w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
                            'hover:bg-accent hover:text-accent-foreground',
                            selectedStoryId === story.id &&
                              'bg-accent text-accent-foreground',
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {story.testType === 'browser' ? (
                              <Globe className="size-3 shrink-0 text-violet-500" />
                            ) : (
                              <Terminal className="size-3 shrink-0 text-amber-500" />
                            )}
                            <span className="truncate font-medium">
                              {story.name}
                            </span>
                            {isTemp && (
                              <span className="text-xs text-muted-foreground">
                                (unsaved)
                              </span>
                            )}
                          </div>
                          {story.scheduleText && (
                            <div className="ml-5 truncate text-xs text-muted-foreground">
                              {story.scheduleText}
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <IntegrationsPanel />
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {selectedStoryId ? (
          <>
            {/* Header with name and actions */}
            <div className="flex items-center gap-4 border-b px-6 py-4">
              <input
                type="text"
                value={editedName}
                onChange={handleNameChange}
                className="flex-1 bg-transparent text-xl font-semibold outline-none placeholder:text-muted-foreground"
                placeholder="Story name..."
              />
              <div className="flex items-center gap-2">
                {hasUnsavedChanges && (
                  <span className="text-xs text-muted-foreground">Unsaved</span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges || isSaving}
                >
                  {isSaving ? <Spinner /> : 'Save'}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleTrigger}
                  disabled={isRunning || hasUnsavedChanges}
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="size-4" />
                      Run
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteClick}
                  disabled={isDeleting || isCreatingNewStory}
                  className="text-destructive hover:text-destructive"
                >
                  {isDeleting ? <Spinner /> : <Trash2 className="size-4" />}
                </Button>
              </div>
            </div>

            <AlertDialog
              open={showDeleteDialog}
              onOpenChange={(open) => {
                if (!open) {
                  handleDeleteCancel()
                }
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Story</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{editedName}"? This action
                    cannot be undone and will permanently delete the story and
                    all associated runs.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={handleDeleteCancel}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteConfirm}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Content area with editor/run details and runs sidebar */}
            <div className="flex flex-1 overflow-hidden">
              {/* Main content - Editor or Run Details */}
              <div className="flex-1 overflow-auto p-6">
                {selectedRun ? (
                  <RunDetailsPanel
                    run={selectedRun}
                    onBack={() => setSelectedRunId(null)}
                  />
                ) : (
                  <StoryEditor
                    instructions={editedInstructions}
                    scheduleText={editedScheduleText}
                    cronSchedule={editedCronSchedule}
                    isParsing={isParsing}
                    parseError={parseError}
                    onInstructionsChange={handleInstructionsChange}
                    onScheduleTextChange={handleScheduleTextChange}
                    onScheduleBlur={handleScheduleBlur}
                  />
                )}
              </div>

              {/* Runs sidebar */}
              <RunSidebar
                runs={runs}
                isLoading={isStoryLoading}
                selectedRunId={selectedRunId}
                nextScheduledRun={nextScheduledRun}
                onRunSelect={setSelectedRunId}
              />
            </div>
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
