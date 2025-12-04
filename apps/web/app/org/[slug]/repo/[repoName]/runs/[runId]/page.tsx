import type { Metadata } from 'next'
import { headers } from 'next/headers'

import { RunPage as RunPageComponent } from '@/components/pages/RunPage'
import { findRepoForUser, getUser } from '@app/api'
import { setupDb } from '@app/db'
import { getAuth } from '@/lib/auth'

// Run detail pages need fresh data (runs update in real-time)
export const dynamic = 'force-dynamic'
export const dynamicParams = true

async function getRunMetadataData(
  orgName: string,
  repoName: string,
  runId: string,
) {
  try {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      return null
    }
    const db = setupDb(databaseUrl)
    const auth = getAuth()

    const headersList = await headers()
    const headersForAuth = new Headers()
    for (const [key, value] of headersList.entries()) {
      headersForAuth.set(key, value)
    }

    const sessionResponse = await auth.api.getSession({
      headers: headersForAuth,
    })

    if (!sessionResponse?.user?.id) {
      return null
    }

    const user = await getUser({ db, userId: sessionResponse.user.id })
    if (!user) {
      return null
    }

    const repo = await findRepoForUser(db, {
      orgName,
      repoName,
      userId: user.id,
    })

    if (!repo) {
      return null
    }

    // Parse runId as number
    const runNumber = Number.parseInt(runId, 10)
    if (Number.isNaN(runNumber) || runNumber < 1) {
      return null
    }

    // Get run info
    const run = await db
      .selectFrom('runs')
      .select(['number', 'status'])
      .where('repoId', '=', repo.id)
      .where('number', '=', runNumber)
      .executeTakeFirst()

    if (!run) {
      return null
    }

    // Get owner info
    const owner = await db
      .selectFrom('owners')
      .select(['login', 'name'])
      .where('id', '=', repo.ownerId)
      .executeTakeFirst()

    return {
      runNumber: run.number,
      runStatus: run.status,
      repoName: repo.name,
      orgName: owner?.login ?? orgName,
      orgDisplayName: owner?.name ?? owner?.login ?? orgName,
    }
  } catch {
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; repoName: string; runId: string }>
}): Promise<Metadata> {
  const { slug, repoName, runId } = await params
  const runData = await getRunMetadataData(slug, repoName, runId)

  if (!runData) {
    return {
      title: `Run #${runId} - ${slug}/${repoName} - Kyoto`,
      description: 'Run details on Kyoto - Intent Testing',
    }
  }

  return {
    title: `Run #${runData.runNumber} - ${runData.orgName}/${runData.repoName} - Kyoto`,
    description: `View run #${runData.runNumber} (${runData.runStatus}) for ${runData.repoName} on Kyoto - Intent Testing platform`,
  }
}

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ slug: string; repoName: string; runId: string }>
}) {
  const resolvedParams = await params
  const { slug, repoName, runId } = resolvedParams
  return <RunPageComponent orgName={slug} repoName={repoName} runId={runId} />
}
