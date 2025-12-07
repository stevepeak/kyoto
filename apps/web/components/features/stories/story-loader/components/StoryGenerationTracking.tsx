import { useTriggerRun } from '@/hooks/use-trigger-run'

import { type StoryDiscoveryOutput } from '../types'

interface StoryGenerationTrackingProps {
  runId: string | null
  publicAccessToken: string | null
  onComplete?: (output: StoryDiscoveryOutput) => void
  onError?: (error: Error | string) => void
}

export function StoryGenerationTracking({
  runId,
  publicAccessToken,
  onComplete,
  onError,
}: StoryGenerationTrackingProps) {
  useTriggerRun<StoryDiscoveryOutput>({
    runId,
    publicAccessToken,
    showToast: false,
    onComplete: (output) => {
      if (onComplete && output) {
        onComplete(output)
      }
    },
    onError: (error) => {
      if (onError) {
        onError(error)
      }
    },
  })

  // Don't render anything - just track the run
  return null
}
