import { type Metadata } from 'next'
import { redirect } from 'next/navigation'

import { SecurityAuditsPage } from '@/components/pages/security-audits-page'
import { getSession } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Security Audits | Kyoto',
  description: 'Comprehensive automated security audits',
}

export default async function SecurityAuditsPageRoute() {
  const session = await getSession()

  if (!session?.user) {
    redirect('/login?redirect=/security-audits')
  }

  return <SecurityAuditsPage />
}
