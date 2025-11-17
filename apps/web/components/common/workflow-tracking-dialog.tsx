'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { useTriggerRun } from '@/hooks/use-trigger-run'

import {
  Dialog,
  DialogContent,
  DialogTitle,
  VisuallyHidden,
} from '@/components/ui/dialog'

interface TriggerDevTrackingContextValue {
  isLoading: boolean
  isCompleted: boolean
  error: string | null
  runId: string | null
  closeDialog: () => void
}

const TriggerDevTrackingContext =
  createContext<TriggerDevTrackingContextValue | null>(null)

export function useTriggerDevTracking() {
  const context = useContext(TriggerDevTrackingContext)
  if (!context) {
    throw new Error(
      'useTriggerDevTracking must be used within TriggerDevTrackingDialog',
    )
  }
  return context
}

interface TriggerDevTrackingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  runId: string | null
  publicAccessToken: string | null
  onComplete?: () => void
  children: ReactNode
}

export function TriggerDevTrackingDialog({
  open,
  onOpenChange,
  runId,
  publicAccessToken,
  onComplete,
  children,
}: TriggerDevTrackingDialogProps) {
  const [error, setError] = useState<string | null>(null)

  // Use the reusable trigger run hook
  const { isLoading, isCompleted, isFailed } = useTriggerRun({
    runId,
    publicAccessToken,
    enabled: open && runId !== null && publicAccessToken !== null,
    onComplete: () => {
      if (onComplete) {
        onComplete()
      }
      // Close dialog after a brief delay to show success state
      setTimeout(() => {
        onOpenChange(false)
      }, 1000)
    },
    onError: (err) => {
      const errorMessage =
        err instanceof Error ? err.message : String(err) || 'Workflow failed'
      setError(errorMessage)
    },
  })

  // Reset state when dialog closes
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setError(null)
      }
      onOpenChange(newOpen)
    },
    [onOpenChange],
  )

  const closeDialog = useCallback(() => {
    handleOpenChange(false)
  }, [handleOpenChange])

  // Reset error when runId changes
  useEffect(() => {
    if (runId === null) {
      setError(null)
    }
  }, [runId])

  const displayError = error ?? (isFailed ? 'Workflow failed' : null)

  const contextValue: TriggerDevTrackingContextValue = {
    isLoading,
    isCompleted,
    error: displayError,
    runId,
    closeDialog,
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg !left-[50%] !top-[50%] !bottom-auto !translate-x-[-50%] !translate-y-[-50%] data-[state=closed]:!slide-out-to-bottom data-[state=open]:!slide-in-from-bottom data-[state=closed]:!zoom-out-100 data-[state=open]:!zoom-in-100 data-[state=closed]:!fade-out-0 data-[state=open]:!fade-in-0 sm:rounded-lg">
        <VisuallyHidden>
          <DialogTitle>Workflow Tracking</DialogTitle>
        </VisuallyHidden>
        <TriggerDevTrackingContext.Provider value={contextValue}>
          {children}
        </TriggerDevTrackingContext.Provider>
      </DialogContent>
    </Dialog>
  )
}
