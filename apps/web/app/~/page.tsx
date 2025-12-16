import { type Metadata } from 'next'
import { redirect } from 'next/navigation'

import { DashboardPage } from '@/components/pages/dashboard-page'
import { getSession } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Kyoto Dashboard',
}

export default async function HomePage() {
  const session = await getSession()
  if (!session?.user?.id) {
    redirect('/login?redirect=/~')
  }

  return <DashboardPage />
}
