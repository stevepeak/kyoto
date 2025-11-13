import { AppProvider } from '@/components/providers/app-provider'

import { StoryDetailLoader } from './story-detail-loader'

export function StoryApp({
  orgName,
  repoName,
  storyId,
}: {
  orgName: string
  repoName: string
  storyId: string
}) {
  return (
    <AppProvider>
      <StoryDetailLoader
        orgName={orgName}
        repoName={repoName}
        storyId={storyId}
      />
    </AppProvider>
  )
}
