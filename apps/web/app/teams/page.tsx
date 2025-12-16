import { type Metadata } from 'next'
import { redirect } from 'next/navigation'

import { OrganizationsListPage } from '@/components/pages/organizations-list-page'
import { getSession } from '@/lib/auth-server'
import { getUserOrganizations } from '@/lib/memberships'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Teams - Kyoto',
  description: 'Your teams on Kyoto',
}

export default async function TeamsPage() {
  const session = await getSession()
  if (!session?.user?.id) {
    redirect('/login?redirect=/teams')
  }

  const organizations = await getUserOrganizations({
    userId: session.user.id,
  })

  return <OrganizationsListPage organizations={organizations} />
}
