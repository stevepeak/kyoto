import { StoryLoader } from './story-loader'

export function StoryCreatePage({
  orgName,
  repoName,
}: {
  orgName: string
  repoName: string
}) {
  return <StoryLoader orgName={orgName} repoName={repoName} />
}
