import type { Metadata } from 'next'
import { headers } from 'next/headers'

import { OrgApp } from '@/components/apps/org-app'
import { findOwnerForUser, getUser } from '@app/api'
import { setupDb } from '@app/db'
import { getAuth } from '@/lib/auth'

// Org pages are user-specific and always dynamic
export const dynamic = 'force-dynamic'
export const dynamicParams = true

async function getOrgMetadataData(orgName: string) {
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

    const owner = await findOwnerForUser(db, {
      orgName,
      userId: user.id,
    })

    return owner
      ? {
          name: owner.name ?? owner.login,
          slug: owner.login,
        }
      : null
  } catch {
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const orgData = await getOrgMetadataData(slug)

  if (!orgData) {
    return {
      title: `${slug} - Kyoto`,
      description: 'Organization page on Kyoto - Intent Testing',
    }
  }

  return {
    title: `${orgData.name} - Kyoto`,
    description: `View ${orgData.name} organization on Kyoto - Intent Testing platform`,
  }
}

export default async function OrgPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <OrgApp orgName={slug} />
}
