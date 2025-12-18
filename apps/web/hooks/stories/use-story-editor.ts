'use client'

import { TEMP_STORY_ID } from '@app/utils'
import { CronExpressionParser } from 'cron-parser'
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { useTRPC } from '@/lib/trpc-client'

export function useStoryEditor(args: {
  selectedStoryId: string | null
  newStoryTestType: string | null
}) {
  const { selectedStoryId, newStoryTestType } = args
  const trpc = useTRPC()

  const [editedName, setEditedName] = useState<string>('')
  const [editedInstructions, setEditedInstructions] = useState<string>('')
  const [editedScheduleText, setEditedScheduleText] = useState<string>('')
  const [editedCronSchedule, setEditedCronSchedule] = useState<string>('')

  const storyQuery = trpc.browserAgents.get.useQuery(
    { id: selectedStoryId ?? '' },
    { enabled: !!selectedStoryId && selectedStoryId !== TEMP_STORY_ID },
  )

  const utils = trpc.useUtils()

  const updateMutation = trpc.browserAgents.update.useMutation({
    onSuccess: () => {
      void storyQuery.refetch()
      void utils.browserAgents.list.invalidate()
    },
  })

  const parseCronMutation = trpc.browserAgents.parseCron.useMutation({
    onSuccess: (data) => {
      setEditedCronSchedule(data.cronSchedule)
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

  const handleInstructionsChange = useCallback((value: string) => {
    setEditedInstructions(value)
  }, [])

  const handleNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setEditedName(e.target.value)
  }, [])

  return {
    editedName,
    editedInstructions,
    editedScheduleText,
    editedCronSchedule,
    hasUnsavedChanges,
    nextScheduledRun,
    isStoryLoading: storyQuery.isLoading,
    isSaving: updateMutation.isPending,
    isParsing: parseCronMutation.isPending,
    parseError: parseCronMutation.error?.message ?? null,
    storyQuery,
    updateMutation,
    handleScheduleTextChange,
    handleScheduleBlur,
    handleInstructionsChange,
    handleNameChange,
    setEditedName,
    setEditedInstructions,
    setEditedScheduleText,
    setEditedCronSchedule,
  }
}
