'use client'

import { type ActiveRun, type StoryRun, type TriggerHandle } from '@app/schemas'
import { useEffect, useState } from 'react'

import { useTriggerRun } from '@/hooks/use-trigger-run'
import { useTRPC } from '@/lib/trpc-client'

type StoryQuery = {
  data?: {
    activeRun?: ActiveRun | null
    runs?: unknown[]
  } | null
  refetch: () => Promise<unknown>
}

export function useStoryRuns(args: {
  selectedStoryId: string | null
  storyQuery: StoryQuery
  onStoryRefetch: () => void
}) {
  const { selectedStoryId, storyQuery, onStoryRefetch } = args
  const trpc = useTRPC()

  const [triggerHandle, setTriggerHandle] = useState<
    (TriggerHandle & { storyId: string }) | null
  >(null)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)

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

  const publicAccessTokenQuery =
    trpc.browserAgents.getRunPublicAccessToken.useQuery(
      { runId: triggerHandle?.runId ?? '' },
      { enabled: Boolean(triggerHandle?.runId) },
    )

  // Run tracking
  useTriggerRun({
    runId: triggerHandle?.runId ?? null,
    publicAccessToken: publicAccessTokenQuery.data?.publicAccessToken ?? null,
    showToast: false,
    onComplete: () => {
      onStoryRefetch()
      setTriggerHandle(null)
    },
    onError: () => {
      onStoryRefetch()
      setTriggerHandle(null)
    },
  })

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

  const runs = (storyQuery.data?.runs ?? []) as StoryRun[]
  const isRunning =
    triggerMutation.isPending ||
    (triggerHandle !== null && triggerHandle.storyId === selectedStoryId) ||
    !!activeRun
  const selectedRun = selectedRunId
    ? runs.find((r) => r.id === selectedRunId)
    : null

  const handleTrigger = () => {
    if (!selectedStoryId) return
    triggerMutation.mutate({ storyId: selectedStoryId })
  }

  return {
    runs,
    isRunning,
    selectedRun,
    selectedRunId,
    setSelectedRunId,
    handleTrigger,
  }
}
