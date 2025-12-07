import { Card, CardContent } from '@/components/ui/card'

import { type RunStory, type StoryTestResult } from '../types'
import { RunStoryCardContent } from './RunStoryCardContent'
import { RunStoryCardHeader } from './RunStoryCardHeader'

interface RunStoryCardProps {
  story: RunStory
  testResult: StoryTestResult | null
  orgName: string
  repoName: string
  commitSha: string | null
}

export function RunStoryCard({
  story,
  testResult,
  orgName,
  repoName,
  commitSha,
}: RunStoryCardProps) {
  return (
    <Card className="border bg-background">
      <CardContent>
        <RunStoryCardHeader
          story={story}
          orgName={orgName}
          repoName={repoName}
        />
        <RunStoryCardContent
          story={story}
          testResult={testResult}
          orgName={orgName}
          repoName={repoName}
          commitSha={commitSha}
        />
      </CardContent>
    </Card>
  )
}
