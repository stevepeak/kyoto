import { RepoOverviewLoader } from './repo-overview-loader'

export function RepoApp({
  orgName,
  repoName,
}: {
  orgName: string
  repoName: string
}) {
  return <RepoOverviewLoader orgName={orgName} repoName={repoName} />
}
