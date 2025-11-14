import { Card, CardContent } from '@/components/ui/card'
import { RunStoryCardHeader } from './RunStoryCardHeader'
import { RunStoryCardContent } from './RunStoryCardContent'
import type { RunStory, StoryTestResult } from '../types'

interface RunStoryCardProps {
  story: RunStory
  testResult: StoryTestResult | null
}

export function RunStoryCard({ story, testResult }: RunStoryCardProps) {
  return (
    <Card className="border">
      <CardContent>
        <RunStoryCardHeader story={story} />
        <RunStoryCardContent story={story} testResult={testResult} />
      </CardContent>
    </Card>
  )
}

