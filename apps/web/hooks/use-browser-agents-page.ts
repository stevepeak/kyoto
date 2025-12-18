'use client'

import {
  type ActiveRun,
  type Story,
  type StoryRun,
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

// UUID for temporary unsaved stories
const TEMP_STORY_ID = '00000000-0000-0000-0000-000000000001'

export function useBrowserAgentsPage() {
  const trpc = useTRPC()

  // UI state
  const [activeTab, setActiveTab] = useState<ActiveTab>('stories')
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)

  // New story state (tracks unsaved new story being created)
  const [newStoryTestType, setNewStoryTestType] =
    useState<StoryTestType | null>(null)

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
    { enabled: !!selectedStoryId && selectedStoryId !== TEMP_STORY_ID },
  )

  // Mutations
  const createMutation = trpc.browserAgents.create.useMutation({
    onSuccess: (newStory) => {
      void storiesQuery.refetch()
      setSelectedStoryId(newStory.id)
      setNewStoryTestType(null)
      // Editor state will be synced by useEffect when storyQuery loads
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

  const publicAccessTokenQuery =
    trpc.browserAgents.getRunPublicAccessToken.useQuery(
      { runId: triggerHandle?.runId ?? '' },
      { enabled: Boolean(triggerHandle?.runId) },
    )

  // Run tracking
  useTriggerRun({
    runId: triggerHandle?.runId ?? null,
    publicAccessToken: publicAccessTokenQuery.data?.publicAccessToken ?? null,
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

  // Clear new story state when selecting an existing story (not the temp one)
  useEffect(() => {
    if (
      selectedStoryId &&
      selectedStoryId !== TEMP_STORY_ID &&
      newStoryTestType
    ) {
      setNewStoryTestType(null)
    }
  }, [selectedStoryId, newStoryTestType])

  // Sync editor state when story selection changes
  useEffect(() => {
    if (storyQuery.data?.story) {
      setEditedName(storyQuery.data.story.name)
      setEditedInstructions(storyQuery.data.story.instructions)
      setEditedScheduleText(storyQuery.data.story.scheduleText ?? '')
      setEditedCronSchedule(storyQuery.data.story.cronSchedule ?? '')
      setNewStoryTestType(null)
    }
  }, [storyQuery.data?.story])

  // Auto-reconnect to active run on page load/story change
  const activeRun = storyQuery.data?.activeRun as ActiveRun | null | undefined
  useEffect(() => {
    if (activeRun && selectedStoryId && !triggerHandle) {
      setTriggerHandle({
        runId: activeRun.triggerHandle.id,
        storyId: selectedStoryId,
      })
    }
  }, [activeRun, triggerHandle, selectedStoryId])

  // Handlers
  const handleCreateStory = useCallback((testType: StoryTestType) => {
    const defaultInstructions =
      testType === 'browser'
        ? '# Browser Agent Instructions\n\nDescribe what the agent should do...'
        : '# VM Agent Instructions\n\nDescribe the CLI/API/SDK test...'
    // Use a fixed UUID for temporary stories (all zeros with a specific pattern)
    const tempId = '00000000-0000-0000-0000-000000000001'
    setSelectedStoryId(tempId)
    setNewStoryTestType(testType)
    setEditedName('New Story')
    setEditedInstructions(defaultInstructions)
    setEditedScheduleText('')
    setEditedCronSchedule('')
  }, [])

  const handleSave = useCallback(() => {
    if (newStoryTestType) {
      // Creating a new story
      createMutation.mutate({
        name: editedName,
        instructions: editedInstructions,
        testType: newStoryTestType,
      })
    } else if (selectedStoryId) {
      // Updating an existing story
      updateMutation.mutate({
        id: selectedStoryId,
        name: editedName,
        instructions: editedInstructions,
        scheduleText: editedScheduleText || null,
        cronSchedule: editedCronSchedule || null,
      })
    }
  }, [
    newStoryTestType,
    selectedStoryId,
    editedName,
    editedInstructions,
    editedScheduleText,
    editedCronSchedule,
    createMutation,
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
  const storiesFromQuery = storiesQuery.data ?? []

  // Add temporary story if creating a new one
  const stories = useMemo(() => {
    if (newStoryTestType && selectedStoryId === TEMP_STORY_ID) {
      const tempStory: Story = {
        id: TEMP_STORY_ID,
        name: editedName,
        instructions: editedInstructions,
        testType: newStoryTestType,
        scheduleText: editedScheduleText || null,
        cronSchedule: editedCronSchedule || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      return [tempStory, ...storiesFromQuery]
    }
    return storiesFromQuery
  }, [
    newStoryTestType,
    selectedStoryId,
    editedName,
    editedInstructions,
    editedScheduleText,
    editedCronSchedule,
    storiesFromQuery,
  ])

  const runs = (storyQuery.data?.runs ?? []) as StoryRun[]
  // Only consider the current story as running if the triggerHandle belongs to it
  const isRunning =
    triggerMutation.isPending ||
    (triggerHandle !== null && triggerHandle.storyId === selectedStoryId) ||
    !!activeRun
  const selectedRun = selectedRunId
    ? runs.find((r) => r.id === selectedRunId)
    : null

  // Compute hasUnsavedChanges by comparing edited values against original values from the query
  // Also true if we're creating a new story
  const originalStory = storyQuery.data?.story
  const hasUnsavedChanges = useMemo(() => {
    // New story being created always has unsaved changes
    if (newStoryTestType) return true

    if (!originalStory) return false
    return (
      editedName !== originalStory.name ||
      editedInstructions !== originalStory.instructions ||
      editedScheduleText !== (originalStory.scheduleText ?? '') ||
      editedCronSchedule !== (originalStory.cronSchedule ?? '')
    )
  }, [
    newStoryTestType,
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
    isCreatingNewStory: newStoryTestType !== null,

    // Computed values
    stories,
    runs,
    isRunning,
    selectedRun,
    nextScheduledRun,

    // Loading states
    isStoriesLoading: storiesQuery.isLoading,
    isStoryLoading: storyQuery.isLoading,
    isCreating: createMutation.isPending,
    isSaving: createMutation.isPending || updateMutation.isPending,
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
