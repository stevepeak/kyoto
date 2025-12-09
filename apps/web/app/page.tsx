'use client'

import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'

import { Button } from '@/components/ui/button'
import { useTriggerRun } from '@/hooks/use-trigger-run'
import { useTRPC } from '@/lib/trpc-client'

export default function HomePage() {
  const router = useRouter()
  const trpc = useTRPC()
  const [triggerHandle, setTriggerHandle] = useState<{
    runId: string
    publicAccessToken: string
  } | null>(null)

  // Keyboard shortcut: Cmd/Ctrl+Enter to navigate to /~
  useHotkeys('mod+enter', () => {
    router.push('/~')
  })

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

  const isButtonDisabled = triggerMutation.isPending || isLoading

  return (
    <main className="container mx-auto min-h-screen py-12">
      <div className="flex flex-col items-center justify-center gap-8">
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
      </div>
    </main>
  )
}
