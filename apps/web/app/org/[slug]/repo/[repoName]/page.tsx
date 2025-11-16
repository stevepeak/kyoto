import { RepoApp } from '@/components/apps/repo-app'

// Repo pages are user-specific and always dynamic
export const dynamic = 'force-dynamic'
export const dynamicParams = true

export default async function RepoPage({
  params,
}: {
  params: Promise<{ slug: string; repoName: string }>
}) {
  const { slug, repoName } = await params
  return <RepoApp orgName={slug} repoName={repoName} />
}

