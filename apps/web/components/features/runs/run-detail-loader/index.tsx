import { Suspense } from 'react'
import { AppLayout } from '@/components/layout'
import { LoadingProgress } from '@/components/ui/loading-progress'
import { RunDetailContent } from './RunDetailContent'

interface RunDetailLoaderProps {
  orgName: string
  repoName: string
  runId: string
}

export function RunDetailLoader({
  orgName,
  repoName,
  runId,
}: RunDetailLoaderProps) {
  return (
    <Suspense
      fallback={
        <AppLayout
          breadcrumbs={[
            { label: orgName, href: `/org/${orgName}` },
            { label: repoName, href: `/org/${orgName}/repo/${repoName}` },
          ]}
        >
          <LoadingProgress label="Loading run..." />
        </AppLayout>
      }
    >
      <RunDetailContent orgName={orgName} repoName={repoName} runId={runId} />
    </Suspense>
  )
}
