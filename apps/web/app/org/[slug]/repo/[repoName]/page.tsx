import type { Metadata } from 'next'
import { headers } from 'next/headers'

import { RepoPage as RepoPageComponent } from '@/components/pages/RepoPage'
import { findRepoForUser, getUser } from '@app/api'
import { setupDb } from '@app/db'
import { getAuth } from '@/lib/auth'

// Repo pages are user-specific and always dynamic
export const dynamic = 'force-dynamic'
export const dynamicParams = true

async function getRepoMetadataData(orgName: string, repoName: string) {
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

    // Get owner info
    const owner = await db
      .selectFrom('owners')
      .select(['login', 'name'])
      .where('id', '=', repo.ownerId)
      .executeTakeFirst()

    return {
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
  params: Promise<{ slug: string; repoName: string }>
}): Promise<Metadata> {
  const { slug, repoName } = await params
  const repoData = await getRepoMetadataData(slug, repoName)

  if (!repoData) {
    return {
      title: `${slug}/${repoName} - Kyoto`,
      description: 'Repository page on Kyoto - Intent Testing',
    }
  }

  return {
    title: `${repoData.orgName}/${repoData.repoName} - Kyoto`,
    description: `View ${repoData.repoName} repository for ${repoData.orgDisplayName} on Kyoto - Intent Testing platform`,
  }
}

export default async function RepoPage({
  params,
}: {
  params: Promise<{ slug: string; repoName: string }>
}) {
  const resolvedParams = await params
  const { slug, repoName } = resolvedParams
  return <RepoPageComponent orgName={slug} repoName={repoName} />
}
