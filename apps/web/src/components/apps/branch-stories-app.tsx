import { AppProvider } from '@/components/providers/app-provider'

import { BranchStoriesLoader } from './branch-stories-loader'

export function BranchStoriesApp({
  orgSlug,
  repoName,
  branchName,
}: {
  orgSlug: string
  repoName: string
  branchName: string
}) {
  return (
    <AppProvider>
      <BranchStoriesLoader orgSlug={orgSlug} repoName={repoName} branchName={branchName} />
    </AppProvider>
  )
}


