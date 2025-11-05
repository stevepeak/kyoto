import { AppProvider } from '@/components/providers/app-provider'

import { RunDetailLoader } from './run-detail-loader'

export function RunApp({
  orgSlug,
  repoName,
  runId,
}: {
  orgSlug: string
  repoName: string
  runId: string
}) {
  return (
    <AppProvider>
      <RunDetailLoader orgSlug={orgSlug} repoName={repoName} runId={runId} />
    </AppProvider>
  )
}
