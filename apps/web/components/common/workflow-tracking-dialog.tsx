'use client'

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react'
import type { ReactNode } from 'react'
import { useRealtimeRun } from '@trigger.dev/react-hooks'

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

function RealtimeWorkflowTracker({
  runId,
  publicAccessToken,
  onStatusChange,
  onError,
}: {
  runId: string
  publicAccessToken: string
  onStatusChange: (status: string) => void
  onError: (error: string) => void
}) {
  const { run, error: runError } = useRealtimeRun(runId, {
    accessToken: publicAccessToken,
  })

  const previousStatusRef = useRef<string | null>(null)
  const previousErrorRef = useRef<unknown>(null)

  useEffect(() => {
    if (runError && runError !== previousErrorRef.current) {
      previousErrorRef.current = runError
      const errorMessage =
        runError && typeof runError === 'object' && 'message' in runError
          ? String(runError.message)
          : 'Failed to track workflow'
      onError(errorMessage)
      return
    }

    if (run && run.status !== previousStatusRef.current) {
      previousStatusRef.current = run.status
      onStatusChange(run.status)
      if (run.status === 'FAILED' || run.status === 'CRASHED') {
        onError('Workflow failed')
      }
    }
  }, [run, runError, onStatusChange, onError])

  return null
}

export function TriggerDevTrackingDialog({
  open,
  onOpenChange,
  runId,
  publicAccessToken,
  onComplete,
  children,
}: TriggerDevTrackingDialogProps) {
  const [runStatus, setRunStatus] = useState<string | null>(null)
  const [runError, setRunError] = useState<string | null>(null)

  // Reset state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setRunStatus(null)
      setRunError(null)
    }
    onOpenChange(newOpen)
  }

  const closeDialog = () => {
    handleOpenChange(false)
  }

  // Memoize error handler to prevent infinite loops
  const handleError = useCallback((error: string) => {
    setRunError(error)
  }, [])

  // Handle workflow completion
  useEffect(() => {
    if (runStatus === 'COMPLETED') {
      if (onComplete) {
        onComplete()
      }
      // Close dialog after a brief delay to show success state
      setTimeout(() => {
        onOpenChange(false)
      }, 1000)
    }
  }, [runStatus, onComplete, onOpenChange])

  const hasTrackingInfo = runId !== null && publicAccessToken !== null
  const isLoading =
    hasTrackingInfo &&
    runStatus !== 'COMPLETED' &&
    runStatus !== 'FAILED' &&
    runStatus !== 'CRASHED' &&
    runError === null

  const isCompleted = runStatus === 'COMPLETED'
  const error =
    runError ??
    (runStatus === 'FAILED' || runStatus === 'CRASHED'
      ? 'Workflow failed'
      : null)

  const contextValue: TriggerDevTrackingContextValue = {
    isLoading,
    isCompleted,
    error,
    closeDialog,
  }

  return (
    <>
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
      {hasTrackingInfo && runId && publicAccessToken && (
        <RealtimeWorkflowTracker
          runId={runId}
          publicAccessToken={publicAccessToken}
          onStatusChange={setRunStatus}
          onError={handleError}
        />
      )}
    </>
  )
}
