import { RunApp } from '@/components/apps/run-app'

// Run detail pages need fresh data (runs update in real-time)
export const dynamic = 'force-dynamic'
export const dynamicParams = true

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ slug: string; repoName: string; runId: string }>
}) {
  const { slug, repoName, runId } = await params
  return <RunApp orgName={slug} repoName={repoName} runId={runId} />
}

