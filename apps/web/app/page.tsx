import { type Metadata } from 'next'

import { DashboardPage } from '@/components/pages/dashboard-page'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Kyoto Dashboard',
}

export default async function HomePage() {
  return <DashboardPage />
}
