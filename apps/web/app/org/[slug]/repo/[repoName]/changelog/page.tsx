import { ChangelogApp } from '@/components/apps/changelog-app'

export const dynamic = 'force-dynamic'
export const dynamicParams = true

export default async function ChangelogPage({
  params,
}: {
  params: Promise<{ slug: string; repoName: string }>
}) {
  const { slug, repoName } = await params

  return <ChangelogApp orgName={slug} repoName={repoName} />
}
