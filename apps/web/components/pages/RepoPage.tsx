import { RepoOverviewLoader } from '@/components/features/repos/repo-overview-loader'

export function RepoPage({
  orgName,
  repoName,
}: {
  orgName: string
  repoName: string
}) {
  return <RepoOverviewLoader orgName={orgName} repoName={repoName} />
}
