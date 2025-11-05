import { AppProvider } from '@/components/providers/app-provider'

import { RepoActionsLoader } from './repo-actions-loader'

export function RepoActionsApp({
  orgSlug,
  repoName,
}: {
  orgSlug: string
  repoName: string
}) {
  return (
    <AppProvider>
      <RepoActionsLoader orgSlug={orgSlug} repoName={repoName} />
    </AppProvider>
  )
}
