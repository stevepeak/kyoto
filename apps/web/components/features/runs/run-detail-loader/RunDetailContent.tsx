import { getTRPCCaller } from '@/lib/trpc-server'
import { AppLayout } from '@/components/layout'
import { RunDetailView } from '@/components/features/runs/RunDetailView'
import { transformRunResponse } from './transformers/transformRunResponse'

interface RunDetailContentProps {
  orgName: string
  repoName: string
  runId: string
}

export async function RunDetailContent({
  orgName,
  repoName,
  runId,
}: RunDetailContentProps) {
  const trpc = await getTRPCCaller()

  const resp = await trpc.run.getByRunId({
    orgName,
    repoName,
    runId,
  })

  const breadcrumbs = [
    { label: orgName, href: `/org/${orgName}` },
    { label: repoName, href: `/org/${orgName}/repo/${repoName}` },
  ]

  if (!resp.run) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="p-6 text-sm text-red-500">Run not found</div>
      </AppLayout>
    )
  }

  const transformedRun = transformRunResponse(resp)
  if (!transformedRun) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="p-6 text-sm text-red-500">Run not found</div>
      </AppLayout>
    )
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <RunDetailView
        run={transformedRun}
        orgName={orgName}
        repoName={repoName}
      />
    </AppLayout>
  )
}
