'use client'

import { Loader2 } from 'lucide-react'
import { useState } from 'react'

import { LoginButton } from '@/components/auth/login-button'
import { Button } from '@/components/ui/button'
import { useTriggerRun } from '@/hooks/use-trigger-run'

export default function HomePage() {
  const [triggerHandle, setTriggerHandle] = useState<{
    runId: string
    publicAccessToken: string
  } | null>(null)
  const [isFetching, setIsFetching] = useState(false)

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
      setIsFetching(false)
    },
    onError: () => {
      setTriggerHandle(null)
      setIsFetching(false)
    },
  })

  const handleTriggerTask = async () => {
    setIsFetching(true)
    try {
      const response = await fetch('/api/trigger/hello-world', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Web2 User' }),
      })

      const data = await response.json()

      if (data.success && data.triggerHandle) {
        setTriggerHandle({
          runId: data.triggerHandle.id,
          publicAccessToken: data.triggerHandle.publicAccessToken,
        })
        // Keep isFetching true - isLoading will take over
      } else {
        // eslint-disable-next-line no-console
        console.error('Failed to trigger task:', data.error)
        setIsFetching(false)
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error triggering task:', error)
      setIsFetching(false)
    }
  }

  const isButtonDisabled = isFetching || isLoading

  return (
    <main className="container mx-auto min-h-screen py-12">
      <div className="flex flex-col items-center justify-center gap-8">
        <h1 className="font-cormorant text-8xl font-semibold tracking-tight md:text-9xl">
          Kyoto
        </h1>
        <LoginButton />
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
