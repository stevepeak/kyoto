import { ChangelogPage as ChangelogPageComponent } from '@/components/pages/ChangelogPage'

export const dynamic = 'force-dynamic'
export const dynamicParams = true

export default async function ChangelogPage({
  params,
}: {
  params: Promise<{ slug: string; repoName: string }>
}) {
  const resolvedParams = await params
  const { slug, repoName } = resolvedParams

  return <ChangelogPageComponent orgName={slug} repoName={repoName} />
}
