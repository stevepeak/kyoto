import { type Metadata } from 'next'
import { redirect } from 'next/navigation'

import { OrganizationsListPage } from '@/components/pages/organizations-list-page'
import { getSession } from '@/lib/auth-server'
import { getUserOrganizations } from '@/lib/memberships'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Kyoto Teams',
  description: 'Kyoto Teams',
}

export default async function OrganizationsPage() {
  const session = await getSession()
  if (!session?.user?.id) {
    redirect('/login?redirect=/~')
  }

  const organizations = await getUserOrganizations({
    userId: session.user.id,
  })

  return <OrganizationsListPage organizations={organizations} />
}
