'use client'

import {
  CheckCircle,
  Circle,
  Clock,
  ExternalLink,
  Loader2,
  Play,
  Plus,
  Trash2,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { Tiptap } from '@/components/tiptap'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { useTriggerRun } from '@/hooks/use-trigger-run'
import { useTRPC } from '@/lib/trpc-client'
import { cn } from '@/lib/utils'

type Story = {
  id: string
  name: string
  instructions: string
  scheduleText: string | null
  cronSchedule: string | null
  createdAt: Date
  updatedAt: Date
}

type Run = {
  id: string
  storyId: string
  status: string
  sessionId: string | null
  sessionRecordingUrl: string | null
  observations: unknown
  error: string | null
  createdAt: Date
  updatedAt: Date
}

type TriggerHandle = {
  runId: string
  publicAccessToken: string
}

export function BrowserAgentsPage() {
  const trpc = useTRPC()

  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null)
  const [editedInstructions, setEditedInstructions] = useState<string>('')
  const [editedName, setEditedName] = useState<string>('')
  const [editedScheduleText, setEditedScheduleText] = useState<string>('')
  const [editedCronSchedule, setEditedCronSchedule] = useState<string>('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [triggerHandle, setTriggerHandle] = useState<TriggerHandle | null>(null)

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
      onProgress: () => 'Browser agent running...',
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
    setEditedCronSchedule('') // Clear stale cron when schedule text changes
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
  const runs = storyQuery.data?.runs ?? []
  const isRunning = triggerMutation.isPending || triggerHandle !== null

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Left sidebar - Story list */}
      <div className="w-72 flex-shrink-0 border-r bg-muted/30">
        <div className="flex h-full flex-col">
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
                {stories.map((story: Story) => (
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
                  disabled={isRunning}
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

            {/* Content area with editor and runs */}
            <div className="flex flex-1 overflow-hidden">
              {/* Editor */}
              <div className="flex-1 overflow-auto p-6">
                {/* Schedule Input */}
                <div className="mb-4 rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                    <Clock className="size-4" />
                    Run Schedule
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={editedScheduleText}
                      onChange={handleScheduleTextChange}
                      onBlur={handleScheduleBlur}
                      placeholder="e.g., every day at 5pm, every hour, every monday at 9am..."
                      className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                    />
                    {parseCronMutation.isPending && (
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  {editedCronSchedule && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Cron:{' '}
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
                        {editedCronSchedule}
                      </code>
                    </div>
                  )}
                  {parseCronMutation.error && (
                    <div className="mt-2 text-xs text-destructive">
                      {parseCronMutation.error.message}
                    </div>
                  )}
                </div>
                <Tiptap
                  value={editedInstructions}
                  onChange={handleInstructionsChange}
                  className="min-h-[400px]"
                  autoFocus
                />
              </div>

              {/* Runs sidebar */}
              <div className="w-80 flex-shrink-0 overflow-auto border-l bg-muted/20 p-4">
                <h3 className="mb-4 text-sm font-semibold">Run History</h3>
                {storyQuery.isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner />
                  </div>
                ) : runs.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No runs yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {runs.map((run: Run) => (
                      <Card key={run.id} className="py-3">
                        <CardHeader className="px-3 py-0">
                          <CardTitle className="flex items-center gap-2 text-sm">
                            <RunStatusIcon status={run.status} />
                            <span className="capitalize">{run.status}</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-3 py-0">
                          <div className="text-xs text-muted-foreground">
                            {new Date(run.createdAt).toLocaleString()}
                          </div>
                          {run.sessionRecordingUrl && (
                            <a
                              href={run.sessionRecordingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <ExternalLink className="size-3" />
                              View Recording
                            </a>
                          )}
                          {run.error && (
                            <div className="mt-2 text-xs text-destructive">
                              {run.error}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="max-w-md text-center">
              <h2 className="text-xl font-semibold">Browser Agents</h2>
              <p className="mt-2 text-muted-foreground">
                Write natural language stories that describe critical user
                journeys. Kyoto runs these as automated sanity checks on your
                production app, catching issues before your users do.
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                Select a story or create a new one to get started.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function RunStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="size-4 text-green-500" />
    case 'failed':
      return <XCircle className="size-4 text-destructive" />
    case 'running':
      return <Loader2 className="size-4 animate-spin text-blue-500" />
    default:
      return <Circle className="size-4 text-muted-foreground" />
  }
}
