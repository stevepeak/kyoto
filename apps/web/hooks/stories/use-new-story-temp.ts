'use client'

import { type Story, type StoryTestType } from '@app/schemas'
import { TEMP_STORY_ID } from '@app/utils'
import { useMemo, useState } from 'react'

export function useNewStoryTemp(args: {
  selectedStoryId: string | null
  editedName: string
  editedInstructions: string
  editedScheduleText: string
  editedCronSchedule: string
}) {
  const {
    selectedStoryId,
    editedName,
    editedInstructions,
    editedScheduleText,
    editedCronSchedule,
  } = args

  const [newStoryTestType, setNewStoryTestType] =
    useState<StoryTestType | null>(null)

  const tempStory: Story | null = useMemo(() => {
    if (newStoryTestType && selectedStoryId === TEMP_STORY_ID) {
      return {
        id: TEMP_STORY_ID,
        name: editedName,
        instructions: editedInstructions,
        testType: newStoryTestType,
        scheduleText: editedScheduleText || null,
        cronSchedule: editedCronSchedule || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    }
    return null
  }, [
    newStoryTestType,
    selectedStoryId,
    editedName,
    editedInstructions,
    editedScheduleText,
    editedCronSchedule,
  ])

  return {
    newStoryTestType,
    setNewStoryTestType,
    tempStory,
    isCreatingNewStory: newStoryTestType !== null,
  }
}
