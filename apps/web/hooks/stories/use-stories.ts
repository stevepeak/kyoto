'use client'

import { type Story } from '@app/schemas'
import { useCallback, useMemo, useState } from 'react'

import { useTRPC } from '@/lib/trpc-client'

export function useStories(args: { tempStory: Story | null }) {
  const { tempStory } = args
  const trpc = useTRPC()
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const storiesQuery = trpc.browserAgents.list.useQuery()

  const createMutation = trpc.browserAgents.create.useMutation({
    onSuccess: (newStory) => {
      void storiesQuery.refetch()
      setSelectedStoryId(newStory.id)
    },
  })

  const deleteMutation = trpc.browserAgents.delete.useMutation({
    onSuccess: () => {
      void storiesQuery.refetch()
      setSelectedStoryId(null)
    },
  })

  const stories = useMemo(() => {
    const storiesFromQuery = storiesQuery.data ?? []
    if (tempStory) {
      return [tempStory, ...storiesFromQuery]
    }
    return storiesFromQuery
  }, [tempStory, storiesQuery.data])

  const handleDeleteClick = useCallback(() => {
    if (!selectedStoryId) return
    setShowDeleteDialog(true)
  }, [selectedStoryId])

  const handleDeleteConfirm = useCallback(() => {
    if (!selectedStoryId) return
    setShowDeleteDialog(false)
    deleteMutation.mutate({ id: selectedStoryId })
  }, [selectedStoryId, deleteMutation])

  const handleDeleteCancel = useCallback(() => {
    setShowDeleteDialog(false)
  }, [])

  return {
    selectedStoryId,
    setSelectedStoryId,
    showDeleteDialog,
    stories,
    isStoriesLoading: storiesQuery.isLoading,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
    createMutation,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
  }
}
