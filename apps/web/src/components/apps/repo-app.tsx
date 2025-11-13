import { AppProvider } from '@/components/providers/app-provider'

import { RepoOverviewLoader } from './repo-overview-loader'

export function RepoApp({
  orgName,
  repoName,
}: {
  orgName: string
  repoName: string
}) {
  return (
    <AppProvider>
      <RepoOverviewLoader orgName={orgName} repoName={repoName} />
    </AppProvider>
  )
}
