import { type Metadata } from 'next'
import { redirect } from 'next/navigation'

import { OrgPage } from '@/components/pages/org-page'
import { getSession } from '@/lib/auth-server'
import {
  checkOwnerMembership,
  getOrgRepositories,
  getUserOrganizations,
} from '@/lib/memberships'

export const dynamic = 'force-dynamic'

interface OrgPageRouteProps {
  params: Promise<{ owner: string }>
}

export async function generateMetadata(
  props: OrgPageRouteProps,
): Promise<Metadata> {
  const params = await props.params
  const { owner } = params

  const session = await getSession()
  if (!session?.user?.id) {
    return {
      title: `${owner} - Kyoto`,
      description: 'Organization page on Kyoto',
    }
  }

  const ownerData = await checkOwnerMembership({
    userId: session.user.id,
    orgSlug: owner,
  })

  if (!ownerData) {
    return {
      title: `${owner} - Kyoto`,
      description: 'Organization page on Kyoto',
    }
  }

  return {
    title: `${ownerData.name ?? ownerData.login} - Kyoto`,
    description: `View ${ownerData.name ?? ownerData.login} organization on Kyoto`,
  }
}

export default async function OrgPageRoute(props: OrgPageRouteProps) {
  const params = await props.params
  const { owner } = params

  const session = await getSession()
  if (!session?.user?.id) {
    redirect(`/login?redirect=/~/${owner}`)
  }

  const ownerData = await checkOwnerMembership({
    userId: session.user.id,
    orgSlug: owner,
  })

  if (!ownerData) {
    return (
      <div className="container mx-auto py-12">
        <h1 className="text-2xl font-semibold">Organization not found</h1>
        <p className="mt-4 text-muted-foreground">
          You don&apos;t have access to this organization or it doesn&apos;t
          exist.
        </p>
      </div>
    )
  }

  const organizations = await getUserOrganizations({
    userId: session.user.id,
  })

  const repositories = await getOrgRepositories({
    userId: session.user.id,
    orgSlug: owner,
  })

  return (
    <OrgPage
      owner={ownerData}
      organizations={organizations}
      repositories={repositories}
    />
  )
}
