import { AppProvider } from '@/components/providers/app-provider'

import { StoryCreateLoader } from './story-create-loader'

export function StoryCreateApp({
  orgName,
  repoName,
}: {
  orgName: string
  repoName: string
}) {
  return (
    <AppProvider>
      <StoryCreateLoader orgName={orgName} repoName={repoName} />
    </AppProvider>
  )
}
