import { AppProvider } from '@/components/providers/app-provider'

import { RepoStoriesLoader } from './repo-stories-loader'

export function RepoStoriesApp({
  orgName,
  repoName,
}: {
  orgName: string
  repoName: string
}) {
  return (
    <AppProvider>
      <RepoStoriesLoader orgName={orgName} repoName={repoName} />
    </AppProvider>
  )
}
