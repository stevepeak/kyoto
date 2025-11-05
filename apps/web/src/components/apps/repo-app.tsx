import { AppProvider } from '@/components/providers/app-provider'

import { RepoOverviewLoader } from './repo-overview-loader'

export function RepoApp({
  orgSlug,
  repoName,
}: {
  orgSlug: string
  repoName: string
}) {
  return (
    <AppProvider>
      <RepoOverviewLoader orgSlug={orgSlug} repoName={repoName} />
    </AppProvider>
  )
}
