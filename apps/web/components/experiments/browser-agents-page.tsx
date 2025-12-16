'use client'

import { CronExpressionParser } from 'cron-parser'
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle,
  Circle,
  Clock,
  Loader2,
  Play,
  Plus,
  Trash2,
  Video,
  Webhook,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import 'rrweb-player/dist/style.css'

import { IntegrationsPanel } from '@/components/experiments/integrations-panel'
import { Tiptap } from '@/components/tiptap'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { useTriggerRun } from '@/hooks/use-trigger-run'
import { useTRPC } from '@/lib/trpc-client'
import { cn } from '@/lib/utils'

type ActiveTab = 'stories' | 'integrations'

type Story = {
  id: string
  name: string
  instructions: string
  scheduleText: string | null
  cronSchedule: string | null
  createdAt: Date
  updatedAt: Date
}

type Observation = {
  action: string
  result: string
  timestamp: string
}

type BrowserAgentOutput = {
  observations: Observation[]
  summary: string
  success: boolean
}

type Run = {
  id: string
  storyId: string
  status: string
  sessionId: string | null
  observations: BrowserAgentOutput | null
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
  const runs = (storyQuery.data?.runs ?? []) as Run[]
  const isRunning = triggerMutation.isPending || triggerHandle !== null
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
                  <>
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
                  </>
                )}
              </div>

              {/* Runs sidebar */}
              <div className="w-80 flex-shrink-0 overflow-auto border-l bg-muted/20 p-4">
                <h3 className="mb-4 text-sm font-semibold">Run History</h3>
                {storyQuery.isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Upcoming scheduled run */}
                    {nextScheduledRun && (
                      <Card className="border-dashed border-primary/50 bg-primary/5 py-3">
                        <CardHeader className="px-3 py-0">
                          <CardTitle className="flex items-center gap-2 text-sm">
                            <CalendarClock className="size-4 text-primary" />
                            <span>Scheduled</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-3 py-0">
                          <div className="text-xs text-muted-foreground">
                            {nextScheduledRun.toLocaleString()}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Past runs */}
                    {runs.length === 0 && !nextScheduledRun ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        No runs yet
                      </div>
                    ) : (
                      runs.map((run) => {
                        const displayStatus = getDisplayStatus(run)
                        return (
                          <Card
                            key={run.id}
                            className={cn(
                              'cursor-pointer py-3 transition-colors hover:bg-accent/50',
                              selectedRunId === run.id && 'ring-2 ring-primary',
                            )}
                            onClick={() => setSelectedRunId(run.id)}
                          >
                            <CardHeader className="px-3 py-0">
                              <CardTitle className="flex items-center gap-2 text-sm">
                                <RunStatusIcon status={displayStatus.status} />
                                <span>{displayStatus.label}</span>
                                {run.sessionId && (
                                  <Video className="ml-auto size-3 text-muted-foreground" />
                                )}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="px-3 py-0">
                              <div className="text-xs text-muted-foreground">
                                {new Date(run.createdAt).toLocaleString()}
                              </div>
                              {run.error && (
                                <div className="mt-2 truncate text-xs text-destructive">
                                  {run.error}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : activeTab === 'stories' ? (
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
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="max-w-md text-center">
              <Webhook className="mx-auto size-12 text-muted-foreground/50" />
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

function RunDetailsPanel({ run, onBack }: { run: Run; onBack: () => void }) {
  const trpc = useTRPC()
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<unknown>(null)
  const [isPlayerReady, setIsPlayerReady] = useState(false)

  const recordingQuery = trpc.xpBrowserAgents.getRecording.useQuery(
    { runId: run.id },
    { enabled: !!run.sessionId },
  )

  const initPlayer = useCallback(async () => {
    if (
      !containerRef.current ||
      !recordingQuery.data?.events ||
      playerRef.current
    ) {
      return
    }

    // Dynamic import to avoid SSR issues
    const rrwebPlayer = await import('rrweb-player')

    // Clear container
    containerRef.current.innerHTML = ''

    playerRef.current = new rrwebPlayer.default({
      target: containerRef.current,
      props: {
        events: recordingQuery.data.events,
        width: 800,
        height: 450,
        autoPlay: false,
        showController: true,
        speedOption: [0.5, 1, 2, 4],
      },
    })

    setIsPlayerReady(true)
  }, [recordingQuery.data?.events])

  useEffect(() => {
    void initPlayer()

    return () => {
      if (playerRef.current) {
        playerRef.current = null
      }
    }
  }, [initPlayer])

  // Reset player when run changes
  useEffect(() => {
    playerRef.current = null
    setIsPlayerReady(false)
  }, [run.id])

  const observations = run.observations
  const displayStatus = getDisplayStatus(run)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Back to Editor
        </Button>
        <div className="flex items-center gap-2">
          <RunStatusIcon status={displayStatus.status} />
          <span className="font-medium">{displayStatus.label}</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {new Date(run.createdAt).toLocaleString()}
        </span>
      </div>

      {/* Summary */}
      {observations && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              {observations.success ? (
                <CheckCircle className="size-5 text-green-500" />
              ) : (
                <XCircle className="size-5 text-destructive" />
              )}
              Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {observations.summary}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {run.error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <XCircle className="size-5" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive">{run.error}</p>
          </CardContent>
        </Card>
      )}

      {/* Session Recording */}
      {run.sessionId && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Video className="size-5" />
              Session Recording
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center rounded-lg bg-muted/50">
              {recordingQuery.isLoading ? (
                <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                  <Loader2 className="size-8 animate-spin" />
                  <span>Loading recording...</span>
                </div>
              ) : recordingQuery.error ? (
                <div className="flex flex-col items-center gap-3 py-12 text-destructive">
                  <span>Failed to load recording</span>
                  <span className="text-sm text-muted-foreground">
                    {recordingQuery.error.message}
                  </span>
                </div>
              ) : !isPlayerReady && recordingQuery.data ? (
                <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                  <Loader2 className="size-8 animate-spin" />
                  <span>Initializing player...</span>
                </div>
              ) : null}
              <div
                ref={containerRef}
                className={cn(isPlayerReady ? 'block' : 'hidden')}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agent Observations */}
      {observations && observations.observations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Agent Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {observations.observations.map((obs, index) => (
                <div key={index} className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="font-medium text-sm">{obs.action}</div>
                      <div className="text-sm text-muted-foreground">
                        {obs.result}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(obs.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No observations yet */}
      {!observations && !run.error && run.status === 'running' && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="size-8 animate-spin mb-4" />
          <p>Agent is running...</p>
        </div>
      )}

      {!observations && !run.error && run.status === 'pending' && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Circle className="size-8 mb-4" />
          <p>Waiting to start...</p>
        </div>
      )}
    </div>
  )
}

function getDisplayStatus(run: Run): { status: string; label: string } {
  if (run.status === 'running') {
    return { status: 'running', label: 'Running' }
  }
  if (run.status === 'pending') {
    return { status: 'pending', label: 'Pending' }
  }
  if (run.status === 'failed' || run.error) {
    return { status: 'failed', label: 'Failed' }
  }
  if (run.status === 'completed') {
    // Check if the agent task actually succeeded
    if (run.observations?.success === false) {
      return { status: 'failed', label: 'Failed' }
    }
    return { status: 'passed', label: 'Pass' }
  }
  return { status: run.status, label: run.status }
}

function RunStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'passed':
      return <CheckCircle className="size-4 text-green-500" />
    case 'failed':
      return <XCircle className="size-4 text-destructive" />
    case 'running':
      return <Loader2 className="size-4 animate-spin text-blue-500" />
    default:
      return <Circle className="size-4 text-muted-foreground" />
  }
}
