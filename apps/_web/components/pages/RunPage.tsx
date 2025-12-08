import { RunDetailLoader } from '@/components/features/runs/run-detail-loader'

export function RunPage({
  orgName,
  repoName,
  runId,
}: {
  orgName: string
  repoName: string
  runId: string
}) {
  return <RunDetailLoader orgName={orgName} repoName={repoName} runId={runId} />
}
