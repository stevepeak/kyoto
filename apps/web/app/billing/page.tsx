import { eq, schema } from '@app/db'
import { type Metadata } from 'next'

import { BillingPage } from '@/components/pages/billing-page'
import { getSession } from '@/lib/auth-server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Billing | Kyoto',
  description: 'Manage your Kyoto subscription and billing',
}

export default async function BillingPageRoute() {
  const session = await getSession()

  // Fetch subscription server-side for initial render
  let currentPlanId: 'free' | 'pro' | 'max' = 'free'

  if (session?.user?.id) {
    try {
      const subscription = await db.query.subscriptions.findFirst({
        where: eq(schema.subscriptions.userId, session.user.id),
      })

      if (subscription) {
        currentPlanId = subscription.planId as 'free' | 'pro' | 'max'
      }
    } catch (error) {
      // If there's an error, default to free
      // eslint-disable-next-line no-console
      console.error('Error fetching subscription:', error)
    }
  }

  return <BillingPage currentPlanId={currentPlanId} />
}
