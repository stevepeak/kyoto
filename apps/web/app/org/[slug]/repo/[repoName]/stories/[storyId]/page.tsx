import type { Metadata } from 'next'
import { headers } from 'next/headers'

import { StoryPage } from '@/components/features/stories/story-page'
import { findStoryForUser, getUser } from '@app/api'
import { setupDb } from '@app/db'
import { getAuth } from '@/lib/auth'

// Story detail pages need fresh data (stories can be edited)
export const dynamic = 'force-dynamic'
export const dynamicParams = true

async function getStoryMetadataData(storyId: string) {
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

    const result = await findStoryForUser(db, {
      storyId,
      userId: user.id,
    })

    if (!result) {
      return null
    }

    const { story, repo } = result

    // Get owner info
    const owner = await db
      .selectFrom('owners')
      .select(['login', 'name'])
      .where('id', '=', repo.ownerId)
      .executeTakeFirst()

    return {
      storyName: story.name ?? 'Untitled Story',
      repoName: repo.name,
      orgName: owner?.login ?? '',
      orgDisplayName: owner?.name ?? owner?.login ?? '',
    }
  } catch {
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; repoName: string; storyId: string }>
}): Promise<Metadata> {
  const { storyId } = await params
  const storyData = await getStoryMetadataData(storyId)

  if (!storyData) {
    return {
      title: 'Story - Kyoto',
      description: 'Story details on Kyoto - Intent Testing',
    }
  }

  return {
    title: `${storyData.storyName} - ${storyData.orgName}/${storyData.repoName} - Kyoto`,
    description: `View story "${storyData.storyName}" for ${storyData.repoName} on Kyoto - Intent Testing platform`,
  }
}

export default async function StoryDetailPage({
  params,
}: {
  params: Promise<{ slug: string; repoName: string; storyId: string }>
}) {
  const resolvedParams = await params
  const { slug, repoName, storyId } = resolvedParams
  return <StoryPage orgName={slug} repoName={repoName} storyId={storyId} />
}
