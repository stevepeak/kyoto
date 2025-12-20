export type PlanId = 'free' | 'pro' | 'max'
export type BillingPeriod = 'monthly' | 'annual'

export interface Plan {
  id: PlanId
  name: string
  description: string
  price: string
  priceDescription?: string
  features: string[]
  cta: string
  highlighted?: boolean
  current?: boolean
}

export const defaultPlans: Omit<Plan, 'price' | 'priceDescription'>[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Perfect for getting started',
    features: [
      '30 Vibe check / month',
      '30 Vibe tests / month',
      '3 Kyoto Stories',
      'Kyoto CLI & MCP',
      'Community support',
    ],
    cta: 'Downgrade to Free',
    current: false,
  },
  {
    id: 'pro',
    name: 'Kyoto Pro',
    description: 'For professional developers',
    features: [
      'Everything in Free',
      '$15 / month in token credits',
      '∞ Unlimited Vibe checks',
      '∞ Unlimited Vibe tests',
      '∞ Unlimited Stories',
      'Priority support',
    ],
    cta: 'Upgrade to Pro',
    current: false,
  },
  {
    id: 'max',
    name: 'Kyoto Max',
    description: 'For power users',
    features: [
      'Everything in Pro',
      'Custom AI agents',
      'Dedicated support',
      'Early access to features',
      'Custom integrations',
    ],
    cta: 'Upgrade to Max',
    highlighted: true,
    current: false,
  },
]

export function getPlanPrice(
  planId: PlanId,
  billingPeriod: BillingPeriod,
): { price: string; priceDescription: string } {
  if (planId === 'free') {
    return { price: '$0', priceDescription: 'forever' }
  }

  const monthlyPrices = {
    pro: 15,
    max: 50,
  }

  const monthlyPrice = monthlyPrices[planId]

  if (billingPeriod === 'monthly') {
    return { price: `$${monthlyPrice}`, priceDescription: 'per month' }
  }

  // Annual: 30% off
  const annualPrice = Math.round(monthlyPrice * 12 * 0.7)
  return { price: `$${annualPrice}`, priceDescription: 'per year' }
}
