'use client'

import {
  type ActiveRun,
  type BrowserAgentRun,
  type BrowserAgentStory,
  type StoryTestType,
  type TriggerHandle,
} from '@app/schemas'
import { CronExpressionParser } from 'cron-parser'
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { useTriggerRun } from '@/hooks/use-trigger-run'
import { useTRPC } from '@/lib/trpc-client'

type ActiveTab = 'stories' | 'integrations'

export function useBrowserAgentsPage() {
  const trpc = useTRPC()

  // UI state
  const [activeTab, setActiveTab] = useState<ActiveTab>('stories')
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)

  // Editor state
  const [editedName, setEditedName] = useState<string>('')
  const [editedInstructions, setEditedInstructions] = useState<string>('')
  const [editedScheduleText, setEditedScheduleText] = useState<string>('')
  const [editedCronSchedule, setEditedCronSchedule] = useState<string>('')

  // Run state - includes storyId to track which story the run belongs to
  const [triggerHandle, setTriggerHandle] = useState<
    (TriggerHandle & { storyId: string }) | null
  >(null)

  // Queries
  const storiesQuery = trpc.browserAgents.list.useQuery()
  const storyQuery = trpc.browserAgents.get.useQuery(
    { id: selectedStoryId ?? '' },
    { enabled: !!selectedStoryId },
  )

  // Mutations
  const createMutation = trpc.browserAgents.create.useMutation({
    onSuccess: (newStory) => {
      void storiesQuery.refetch()
      setSelectedStoryId(newStory.id)
      setEditedName(newStory.name)
      setEditedInstructions(newStory.instructions)
      setEditedScheduleText('')
      setEditedCronSchedule('')
    },
  })

  const updateMutation = trpc.browserAgents.update.useMutation({
    onSuccess: () => {
      void storiesQuery.refetch()
      void storyQuery.refetch()
    },
  })

  const deleteMutation = trpc.browserAgents.delete.useMutation({
    onSuccess: () => {
      void storiesQuery.refetch()
      setSelectedStoryId(null)
      setEditedName('')
      setEditedInstructions('')
      setEditedScheduleText('')
      setEditedCronSchedule('')
    },
  })

  const triggerMutation = trpc.browserAgents.trigger.useMutation({
    onSuccess: (data) => {
      if (selectedStoryId) {
        setTriggerHandle({
          runId: data.triggerHandle.id,
          publicAccessToken: data.triggerHandle.publicAccessToken,
          storyId: selectedStoryId,
        })
      }
      void storyQuery.refetch()
    },
  })

  const parseCronMutation = trpc.browserAgents.parseCron.useMutation({
    onSuccess: (data) => {
      setEditedCronSchedule(data.cronSchedule)
    },
  })

  // Run tracking
  useTriggerRun({
    runId: triggerHandle?.runId ?? null,
    publicAccessToken: triggerHandle?.publicAccessToken ?? null,
    toastMessages: {
      onProgress: (text) =>
        text.split('\n').pop() || 'User story test running...',
      onSuccess: 'User story test completed! 🎉',
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

  // Sync editor state when story selection changes
  useEffect(() => {
    if (storyQuery.data?.story) {
      setEditedName(storyQuery.data.story.name)
      setEditedInstructions(storyQuery.data.story.instructions)
      setEditedScheduleText(storyQuery.data.story.scheduleText ?? '')
      setEditedCronSchedule(storyQuery.data.story.cronSchedule ?? '')
    }
  }, [storyQuery.data?.story])

  // Auto-reconnect to active run on page load/story change
  const activeRun = storyQuery.data?.activeRun as ActiveRun | null | undefined
  useEffect(() => {
    if (activeRun && selectedStoryId && !triggerHandle) {
      setTriggerHandle({
        runId: activeRun.triggerHandle.id,
        publicAccessToken: activeRun.triggerHandle.publicAccessToken,
        storyId: selectedStoryId,
      })
    }
  }, [activeRun, triggerHandle, selectedStoryId])

  // Handlers
  const handleCreateStory = useCallback(
    (testType: StoryTestType) => {
      const defaultInstructions =
        testType === 'browser'
          ? '# Browser Agent Instructions\n\nDescribe what the agent should do...'
          : '# VM Agent Instructions\n\nDescribe the CLI/API/SDK test...'
      createMutation.mutate({
        name: 'New Story',
        instructions: defaultInstructions,
        testType,
      })
    },
    [createMutation],
  )

  const handleSave = useCallback(() => {
    if (!selectedStoryId) return
    updateMutation.mutate({
      id: selectedStoryId,
      name: editedName,
      instructions: editedInstructions,
      scheduleText: editedScheduleText || null,
      cronSchedule: editedCronSchedule || null,
    })
  }, [
    selectedStoryId,
    editedName,
    editedInstructions,
    editedScheduleText,
    editedCronSchedule,
    updateMutation,
  ])

  const handleDelete = useCallback(() => {
    if (!selectedStoryId) return
    deleteMutation.mutate({ id: selectedStoryId })
  }, [selectedStoryId, deleteMutation])

  const handleScheduleTextChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setEditedScheduleText(e.target.value)
      setEditedCronSchedule('')
    },
    [],
  )

  const handleScheduleBlur = useCallback(() => {
    if (
      editedScheduleText.trim() &&
      editedScheduleText !== storyQuery.data?.story?.scheduleText
    ) {
      parseCronMutation.mutate({ text: editedScheduleText })
    }
  }, [
    editedScheduleText,
    storyQuery.data?.story?.scheduleText,
    parseCronMutation,
  ])

  const handleTrigger = useCallback(() => {
    if (!selectedStoryId) return
    triggerMutation.mutate({ storyId: selectedStoryId })
  }, [selectedStoryId, triggerMutation])

  const handleInstructionsChange = useCallback((value: string) => {
    setEditedInstructions(value)
  }, [])

  const handleNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setEditedName(e.target.value)
  }, [])

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

  // Computed values
  const stories = storiesQuery.data ?? []
  const runs = (storyQuery.data?.runs ?? []) as BrowserAgentRun[]
  // Only consider the current story as running if the triggerHandle belongs to it
  const isRunning =
    triggerMutation.isPending ||
    (triggerHandle !== null && triggerHandle.storyId === selectedStoryId) ||
    !!activeRun
  const selectedRun = selectedRunId
    ? runs.find((r) => r.id === selectedRunId)
    : null

  // Compute hasUnsavedChanges by comparing edited values against original values from the query
  const originalStory = storyQuery.data?.story
  const hasUnsavedChanges = useMemo(() => {
    if (!originalStory) return false
    return (
      editedName !== originalStory.name ||
      editedInstructions !== originalStory.instructions ||
      editedScheduleText !== (originalStory.scheduleText ?? '') ||
      editedCronSchedule !== (originalStory.cronSchedule ?? '')
    )
  }, [
    originalStory,
    editedName,
    editedInstructions,
    editedScheduleText,
    editedCronSchedule,
  ])

  const nextScheduledRun = useMemo(() => {
    if (!editedCronSchedule) return null
    try {
      const interval = CronExpressionParser.parse(editedCronSchedule)
      return interval.next().toDate()
    } catch {
      return null
    }
  }, [editedCronSchedule])

  return {
    // UI state
    activeTab,
    setActiveTab,
    selectedStoryId,
    setSelectedStoryId,
    selectedRunId,
    setSelectedRunId,

    // Editor state
    editedName,
    editedInstructions,
    editedScheduleText,
    editedCronSchedule,
    hasUnsavedChanges,

    // Computed values
    stories: stories as BrowserAgentStory[],
    runs,
    isRunning,
    selectedRun,
    nextScheduledRun,

    // Loading states
    isStoriesLoading: storiesQuery.isLoading,
    isStoryLoading: storyQuery.isLoading,
    isCreating: createMutation.isPending,
    isSaving: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isParsing: parseCronMutation.isPending,
    parseError: parseCronMutation.error?.message ?? null,

    // Handlers
    handleCreateStory,
    handleSave,
    handleDelete,
    handleScheduleTextChange,
    handleScheduleBlur,
    handleTrigger,
    handleInstructionsChange,
    handleNameChange,
  }
}
