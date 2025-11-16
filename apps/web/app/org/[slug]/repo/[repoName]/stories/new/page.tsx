import { StoryCreatePage } from '@/components/apps/story-create-page'

// Story create page is user-specific and always dynamic
export const dynamic = 'force-dynamic'
export const dynamicParams = true

export default async function StoryNewPage({
  params,
}: {
  params: Promise<{ slug: string; repoName: string }>
}) {
  const { slug, repoName } = await params
  return <StoryCreatePage orgName={slug} repoName={repoName} />
}
