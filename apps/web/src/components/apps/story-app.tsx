import { AppProvider } from '@/components/providers/app-provider'

import { StoryDetailLoader } from './story-detail-loader'

export function StoryApp({
  orgSlug,
  repoName,
  storyId,
}: {
  orgSlug: string
  repoName: string
  storyId: string
}) {
  return (
    <AppProvider>
      <StoryDetailLoader
        orgSlug={orgSlug}
        repoName={repoName}
        storyId={storyId}
      />
    </AppProvider>
  )
}
