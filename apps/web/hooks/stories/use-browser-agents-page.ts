'use client'

import { type Story, type StoryTestType } from '@app/schemas'
import { TEMP_STORY_ID } from '@app/utils'
import { useCallback, useEffect, useState } from 'react'

import { useNewStoryTemp } from '@/hooks/stories/use-new-story-temp'
import { useStories } from '@/hooks/stories/use-stories'
import { useStoryEditor } from '@/hooks/stories/use-story-editor'
import { useStoryRuns } from '@/hooks/stories/use-story-runs'

type ActiveTab = 'stories' | 'integrations'

export function useBrowserAgentsPage() {
  // UI state
  const [activeTab, setActiveTab] = useState<ActiveTab>('stories')

  // Initialize stories hook with placeholder (will be updated after tempHook is created)
  const [tempStoryState, setTempStoryState] = useState<Story | null>(null)

  // Initialize stories hook (manages selectedStoryId and stories list)
  const storiesHook = useStories({
    tempStory: tempStoryState,
  })

  // Initialize editor hook with placeholder (will be updated after tempHook is created)
  const [newStoryTestTypeState, setNewStoryTestTypeState] =
    useState<StoryTestType | null>(null)

  const editorHook = useStoryEditor({
    selectedStoryId: storiesHook.selectedStoryId,
    newStoryTestType: newStoryTestTypeState,
  })

  // Initialize temp story hook (manages newStoryTestType state and tempStory computation)
  const tempHook = useNewStoryTemp({
    selectedStoryId: storiesHook.selectedStoryId,
    editedName: editorHook.editedName,
    editedInstructions: editorHook.editedInstructions,
    editedScheduleText: editorHook.editedScheduleText,
    editedCronSchedule: editorHook.editedCronSchedule,
  })

  // Sync tempHook values to state used by other hooks
  useEffect(() => {
    setTempStoryState(tempHook.tempStory)
    setNewStoryTestTypeState(tempHook.newStoryTestType)
  }, [tempHook.tempStory, tempHook.newStoryTestType])

  // Update editor reset callback
  const editorResetImpl = useCallback(() => {
    editorHook.setEditedName('')
    editorHook.setEditedInstructions('')
    editorHook.setEditedScheduleText('')
    editorHook.setEditedCronSchedule('')
  }, [editorHook])

  // Initialize runs hook (manages runs and triggering)
  const runsHook = useStoryRuns({
    selectedStoryId: storiesHook.selectedStoryId,
    storyQuery: editorHook.storyQuery,
    onStoryRefetch: () => {
      void editorHook.storyQuery.refetch()
    },
  })

  // Clear new story state when selecting an existing story (not the temp one)
  useEffect(() => {
    if (
      storiesHook.selectedStoryId &&
      storiesHook.selectedStoryId !== TEMP_STORY_ID &&
      tempHook.newStoryTestType
    ) {
      tempHook.setNewStoryTestType(null)
    }
  }, [
    storiesHook.selectedStoryId,
    tempHook.newStoryTestType,
    tempHook.setNewStoryTestType,
    tempHook,
  ])

  // Handlers
  const handleCreateStory = useCallback(
    (testType: StoryTestType) => {
      const defaultInstructions =
        testType === 'browser'
          ? '# Browser Agent Instructions\n\nDescribe what the agent should do...'
          : '# VM Agent Instructions\n\nDescribe the CLI/API/SDK test...'
      storiesHook.setSelectedStoryId(TEMP_STORY_ID)
      tempHook.setNewStoryTestType(testType)
      editorHook.setEditedName('New Story')
      editorHook.setEditedInstructions(defaultInstructions)
      editorHook.setEditedScheduleText('')
      editorHook.setEditedCronSchedule('')
    },
    [storiesHook, editorHook, tempHook],
  )

  const handleSave = useCallback(() => {
    if (tempHook.newStoryTestType) {
      // Creating a new story
      storiesHook.createMutation.mutate({
        name: editorHook.editedName,
        instructions: editorHook.editedInstructions,
        testType: tempHook.newStoryTestType,
      })
      tempHook.setNewStoryTestType(null)
    } else if (storiesHook.selectedStoryId) {
      // Updating an existing story
      editorHook.updateMutation.mutate({
        id: storiesHook.selectedStoryId,
        name: editorHook.editedName,
        instructions: editorHook.editedInstructions,
        scheduleText: editorHook.editedScheduleText || null,
        cronSchedule: editorHook.editedCronSchedule || null,
      })
    }
  }, [tempHook, storiesHook, editorHook])

  // Wrap delete confirm to also reset editor
  const handleDeleteConfirm = useCallback(() => {
    storiesHook.handleDeleteConfirm()
    editorResetImpl()
  }, [storiesHook, editorResetImpl])

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

  return {
    // UI state
    activeTab,
    setActiveTab,
    selectedStoryId: storiesHook.selectedStoryId,
    setSelectedStoryId: storiesHook.setSelectedStoryId,
    selectedRunId: runsHook.selectedRunId,
    setSelectedRunId: runsHook.setSelectedRunId,

    // Editor state
    editedName: editorHook.editedName,
    editedInstructions: editorHook.editedInstructions,
    editedScheduleText: editorHook.editedScheduleText,
    editedCronSchedule: editorHook.editedCronSchedule,
    hasUnsavedChanges: editorHook.hasUnsavedChanges,
    isCreatingNewStory: tempHook.isCreatingNewStory,

    // Computed values
    stories: storiesHook.stories,
    runs: runsHook.runs,
    isRunning: runsHook.isRunning,
    selectedRun: runsHook.selectedRun,
    nextScheduledRun: editorHook.nextScheduledRun,

    // Loading states
    isStoriesLoading: storiesHook.isStoriesLoading,
    isStoryLoading: editorHook.isStoryLoading,
    isCreating: storiesHook.isCreating,
    isSaving: editorHook.isSaving,
    isDeleting: storiesHook.isDeleting,
    isParsing: editorHook.isParsing,
    parseError: editorHook.parseError,

    // Handlers
    handleCreateStory,
    handleSave,
    handleDeleteClick: storiesHook.handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel: storiesHook.handleDeleteCancel,
    showDeleteDialog: storiesHook.showDeleteDialog,
    handleScheduleTextChange: editorHook.handleScheduleTextChange,
    handleScheduleBlur: editorHook.handleScheduleBlur,
    handleTrigger: runsHook.handleTrigger,
    handleInstructionsChange: editorHook.handleInstructionsChange,
    handleNameChange: editorHook.handleNameChange,
  }
}
