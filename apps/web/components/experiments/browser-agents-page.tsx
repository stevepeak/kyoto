'use client'

import { CronExpressionParser } from 'cron-parser'
import { Loader2, Play, Plus, Trash2, Webhook } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type {
  ActiveRun,
  BrowserAgentRun,
  BrowserAgentStory,
  TriggerHandle,
} from '@app/schemas'

import {
  RunDetailsPanel,
  RunSidebar,
  StoryEditor,
} from '@/components/experiments/browser-agents'
import { IntegrationsPanel } from '@/components/experiments/integrations-panel'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useTriggerRun } from '@/hooks/use-trigger-run'
import { useTRPC } from '@/lib/trpc-client'
import { cn } from '@/lib/utils'
import { Kanji } from '../kanji'

type ActiveTab = 'stories' | 'integrations'

export function BrowserAgentsPage() {
  const trpc = useTRPC()

  const [activeTab, setActiveTab] = useState<ActiveTab>('stories')
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null)
  const [editedInstructions, setEditedInstructions] = useState<string>('')
  const [editedName, setEditedName] = useState<string>('')
  const [editedScheduleText, setEditedScheduleText] = useState<string>('')
  const [editedCronSchedule, setEditedCronSchedule] = useState<string>('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [triggerHandle, setTriggerHandle] = useState<TriggerHandle | null>(null)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)

  const storiesQuery = trpc.xpBrowserAgents.list.useQuery()
  const storyQuery = trpc.xpBrowserAgents.get.useQuery(
    { id: selectedStoryId ?? '' },
    { enabled: !!selectedStoryId },
  )

  const createMutation = trpc.xpBrowserAgents.create.useMutation({
    onSuccess: (newStory) => {
      void storiesQuery.refetch()
      setSelectedStoryId(newStory.id)
      setEditedName(newStory.name)
      setEditedInstructions(newStory.instructions)
      setEditedScheduleText('')
      setEditedCronSchedule('')
      setHasUnsavedChanges(false)
    },
  })

  const updateMutation = trpc.xpBrowserAgents.update.useMutation({
    onSuccess: () => {
      void storiesQuery.refetch()
      void storyQuery.refetch()
      setHasUnsavedChanges(false)
    },
  })

  const deleteMutation = trpc.xpBrowserAgents.delete.useMutation({
    onSuccess: () => {
      void storiesQuery.refetch()
      setSelectedStoryId(null)
      setEditedName('')
      setEditedInstructions('')
      setEditedScheduleText('')
      setEditedCronSchedule('')
      setHasUnsavedChanges(false)
    },
  })

  const triggerMutation = trpc.xpBrowserAgents.trigger.useMutation({
    onSuccess: (data) => {
      setTriggerHandle({
        runId: data.triggerHandle.id,
        publicAccessToken: data.triggerHandle.publicAccessToken,
      })
      void storyQuery.refetch()
    },
  })

  const parseCronMutation = trpc.xpBrowserAgents.parseCron.useMutation({
    onSuccess: (data) => {
      setEditedCronSchedule(data.cronSchedule)
      setHasUnsavedChanges(true)
    },
  })

  useTriggerRun({
    runId: triggerHandle?.runId ?? null,
    publicAccessToken: triggerHandle?.publicAccessToken ?? null,
    toastMessages: {
      onProgress: (text) =>
        text.split('\n').pop() || 'Browser agent running...',
      onSuccess: 'Browser agent completed! 🎉',
      onError: (error) =>
        `Agent failed: ${error instanceof Error ? error.message : String(error)}`,
    },
    onComplete: () => {
      void storyQuery.refetch()
      setTriggerHandle(null)
    },
    onError: () => {
      void storyQuery.refetch()
      setTriggerHandle(null)
    },
  })

  // Update editor when story selection changes
  useEffect(() => {
    if (storyQuery.data?.story) {
      setEditedName(storyQuery.data.story.name)
      setEditedInstructions(storyQuery.data.story.instructions)
      setEditedScheduleText(storyQuery.data.story.scheduleText ?? '')
      setEditedCronSchedule(storyQuery.data.story.cronSchedule ?? '')
      setHasUnsavedChanges(false)
    }
  }, [storyQuery.data?.story])

  // Auto-reconnect to active run on page load/story change
  const activeRun = storyQuery.data?.activeRun as ActiveRun | null | undefined
  useEffect(() => {
    if (activeRun && !triggerHandle) {
      setTriggerHandle({
        runId: activeRun.triggerHandle.id,
        publicAccessToken: activeRun.triggerHandle.publicAccessToken,
      })
    }
  }, [activeRun, triggerHandle])

  const handleCreateStory = () => {
    createMutation.mutate({
      name: 'New Story',
      instructions:
        '# Browser Agent Instructions\n\nDescribe what the agent should do...',
    })
  }

  const handleSave = useCallback(() => {
    if (!selectedStoryId || !hasUnsavedChanges) return
    updateMutation.mutate({
      id: selectedStoryId,
      name: editedName,
      instructions: editedInstructions,
      scheduleText: editedScheduleText || null,
      cronSchedule: editedCronSchedule || null,
    })
  }, [
    selectedStoryId,
    hasUnsavedChanges,
    editedName,
    editedInstructions,
    editedScheduleText,
    editedCronSchedule,
    updateMutation,
  ])

  const handleDelete = () => {
    if (!selectedStoryId) return
    deleteMutation.mutate({ id: selectedStoryId })
  }

  const handleScheduleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedScheduleText(e.target.value)
    setEditedCronSchedule('')
    setHasUnsavedChanges(true)
  }

  const handleScheduleBlur = () => {
    if (
      editedScheduleText.trim() &&
      editedScheduleText !== storyQuery.data?.story?.scheduleText
    ) {
      parseCronMutation.mutate({ text: editedScheduleText })
    }
  }

  const handleTrigger = () => {
    if (!selectedStoryId) return
    triggerMutation.mutate({ storyId: selectedStoryId })
  }

  const handleInstructionsChange = (value: string) => {
    setEditedInstructions(value)
    setHasUnsavedChanges(true)
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedName(e.target.value)
    setHasUnsavedChanges(true)
  }

  // Keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave])

  const stories = storiesQuery.data ?? []
  const runs = (storyQuery.data?.runs ?? []) as BrowserAgentRun[]
  const isRunning =
    triggerMutation.isPending || triggerHandle !== null || !!activeRun
  const selectedRun = selectedRunId
    ? runs.find((r) => r.id === selectedRunId)
    : null

  // Calculate next scheduled run from cron
  const nextScheduledRun = useMemo(() => {
    if (!editedCronSchedule) return null
    try {
      const interval = CronExpressionParser.parse(editedCronSchedule)
      return interval.next().toDate()
    } catch {
      return null
    }
  }, [editedCronSchedule])

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
                <Button
                  onClick={handleCreateStory}
                  disabled={createMutation.isPending}
                  className="w-full"
                  variant="outline"
                >
                  {createMutation.isPending ? (
                    <Spinner />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  New Story
                </Button>
              </div>

              <div className="flex-1 overflow-auto p-2">
                {storiesQuery.isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner />
                  </div>
                ) : stories.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No stories yet
                  </div>
                ) : (
                  <div className="space-y-1">
                    {stories.map((story: BrowserAgentStory) => (
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
                        <div className="truncate font-medium">{story.name}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {new Date(story.updatedAt).toLocaleDateString()}
                        </div>
                      </button>
                    ))}
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
                  disabled={!hasUnsavedChanges || updateMutation.isPending}
                >
                  {updateMutation.isPending ? <Spinner /> : 'Save'}
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
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="text-destructive hover:text-destructive"
                >
                  {deleteMutation.isPending ? (
                    <Spinner />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
              </div>
            </div>

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
                    isParsing={parseCronMutation.isPending}
                    parseError={parseCronMutation.error?.message ?? null}
                    onInstructionsChange={handleInstructionsChange}
                    onScheduleTextChange={handleScheduleTextChange}
                    onScheduleBlur={handleScheduleBlur}
                  />
                )}
              </div>

              {/* Runs sidebar */}
              <RunSidebar
                runs={runs}
                isLoading={storyQuery.isLoading}
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
