import { RunDetailLoader } from './run-detail-loader'

export function RunApp({
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
