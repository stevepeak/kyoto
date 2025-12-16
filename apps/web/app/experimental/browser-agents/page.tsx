import { type Metadata } from 'next'
import { redirect } from 'next/navigation'

import { BrowserAgentsPage } from '@/components/experiments/browser-agents-page'
import { getSession } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Browser Agents - Experimental',
  description: 'Experimental browser agent stories',
}

export default async function ExperimentalBrowserAgentsPage() {
  const session = await getSession()

  if (!session?.user) {
    redirect('/login?redirect=/experimental/browser-agents')
  }

  return <BrowserAgentsPage />
}
