'use client'

import { Loader2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { useTriggerRun } from '@/hooks/use-trigger-run'
import { useTRPC } from '@/lib/trpc-client'

type TriggerHandle = {
  runId: string
  publicAccessToken: string
}

export function DevelopmentTrigger() {
  const trpc = useTRPC()
  const [triggerHandle, setTriggerHandle] = useState<TriggerHandle | null>(null)

  const { isLoading } = useTriggerRun({
    runId: triggerHandle?.runId ?? null,
    publicAccessToken: triggerHandle?.publicAccessToken ?? null,
    toastMessages: {
      onProgress: (text) => {
        const lines = text.split('\n').filter(Boolean)
        return lines[lines.length - 1] ?? 'Processing...'
      },
      onSuccess: 'Hello World task completed! 🎉',
      onError: (error) =>
        `Task failed: ${error instanceof Error ? error.message : String(error)}`,
    },
    onComplete: (output) => {
      // eslint-disable-next-line no-console
      console.log('Task completed:', output)
      setTriggerHandle(null)
    },
    onError: () => {
      setTriggerHandle(null)
    },
  })

  const triggerMutation = trpc.trigger.helloWorld.useMutation({
    onSuccess: (data) => {
      if (data.success && data.triggerHandle) {
        setTriggerHandle({
          runId: data.triggerHandle.id,
          publicAccessToken: data.triggerHandle.publicAccessToken,
        })
      }
    },
  })

  const handleTriggerTask = () => {
    triggerMutation.mutate({ name: 'Web2 User' })
  }

  const isButtonDisabled =
    triggerMutation.isPending || isLoading || triggerHandle !== null

  return (
    <Button onClick={handleTriggerTask} disabled={isButtonDisabled}>
      {isButtonDisabled ? (
        <>
          <Loader2 className="animate-spin" />
          Running...
        </>
      ) : (
        'Trigger Hello World Task'
      )}
    </Button>
  )
}
