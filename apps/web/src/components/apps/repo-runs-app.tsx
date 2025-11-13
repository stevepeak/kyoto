import { AppProvider } from '@/components/providers/app-provider'

import { RepoRunsLoader } from './repo-runs-loader'

export function RepoRunsApp({
  orgName,
  repoName,
}: {
  orgName: string
  repoName: string
}) {
  return (
    <AppProvider>
      <RepoRunsLoader orgName={orgName} repoName={repoName} />
    </AppProvider>
  )
}
