import { StoryPage } from '@/components/apps/story-page'

// Story detail pages need fresh data (stories can be edited)
export const dynamic = 'force-dynamic'
export const dynamicParams = true

export default async function StoryDetailPage({
  params,
}: {
  params: Promise<{ slug: string; repoName: string; storyId: string }>
}) {
  const { slug, repoName, storyId } = await params
  return <StoryPage orgName={slug} repoName={repoName} storyId={storyId} />
}
