import { StoryLoader } from './story-loader'

export function StoryPage({
  orgName,
  repoName,
  storyId,
}: {
  orgName: string
  repoName: string
  storyId: string
}) {
  return <StoryLoader orgName={orgName} repoName={repoName} storyId={storyId} />
}
