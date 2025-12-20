'use client'

import { Check, Sparkles } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useTRPC } from '@/lib/trpc-client'
import { cn } from '@/lib/utils'

type PlanId = 'free' | 'pro' | 'max'
type BillingPeriod = 'monthly' | 'annual'

interface Plan {
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

interface BillingPageProps {
  currentPlanId?: PlanId
  onPlanSelect?: (planId: PlanId) => void
}

const getPlanPrice = (
  planId: PlanId,
  billingPeriod: BillingPeriod,
): { price: string; priceDescription: string } => {
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

const defaultPlans: Omit<Plan, 'price' | 'priceDescription'>[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Perfect for getting started',
    features: [
      '30 Vibe check / month',
      '30 Vibe tests / month',
      '3 Kyoto Stories',
      'Kyoto CLI & MCP',
      'Community support via X',
    ],
    cta: 'Current plan',
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

export function BillingPage({ currentPlanId, onPlanSelect }: BillingPageProps) {
  const trpc = useTRPC()
  const searchParams = useSearchParams()
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly')

  // Fetch subscription from tRPC
  const subscriptionQuery = trpc.billing.getSubscription.useQuery()
  const checkoutMutation = trpc.billing.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url
      }
    },
    onError: (error) => {
      toast.error(`Failed to create checkout session: ${error.message}`)
    },
  })

  // Handle success/cancel query params
  useEffect(() => {
    const success = searchParams.get('success')
    const canceled = searchParams.get('canceled')

    if (success === 'true') {
      toast.success('Subscription activated successfully!')
      void subscriptionQuery.refetch()
      // Clean up URL
      window.history.replaceState({}, '', '/billing')
    } else if (canceled === 'true') {
      toast.info('Checkout canceled')
      // Clean up URL
      window.history.replaceState({}, '', '/billing')
    }
  }, [searchParams, subscriptionQuery])

  // Use subscription from query if available, otherwise fall back to prop
  const effectivePlanId =
    subscriptionQuery.data?.planId ?? currentPlanId ?? 'free'

  const handlePlanSelect = (planId: PlanId) => {
    if (planId === 'free') {
      // Free plan doesn't need checkout
      return
    }

    if (onPlanSelect) {
      onPlanSelect(planId)
      return
    }

    // Default: create checkout session
    checkoutMutation.mutate({
      planId,
      billingPeriod,
    })
  }

  const plans: Plan[] = defaultPlans.map((plan) => {
    const { price, priceDescription } = getPlanPrice(plan.id, billingPeriod)
    return {
      ...plan,
      price,
      priceDescription,
      current: plan.id === effectivePlanId,
    }
  })

  return (
    <div className="container mx-auto min-h-screen py-12">
      <div className="mx-auto max-w-5xl space-y-12">
        {/* Header */}
        <div className="space-y-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            Choose your plan
          </h1>
          <p className="text-lg text-muted-foreground">
            Select the plan that works best for you. Upgrade or downgrade at any
            time.
          </p>
        </div>

        {/* Billing Period Toggle */}
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center gap-2 rounded-lg border bg-muted p-1">
            <button
              type="button"
              onClick={() => setBillingPeriod('monthly')}
              className={cn(
                'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                billingPeriod === 'monthly'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingPeriod('annual')}
              className={cn(
                'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                'relative',
                billingPeriod === 'annual'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Annual
              <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">
                30% off
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={cn(
                'relative flex flex-col',
                plan.highlighted && 'border-2 border-primary shadow-lg',
                plan.current && 'ring-2 ring-primary ring-offset-2',
              )}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    <Sparkles className="size-3" />
                    Popular
                  </span>
                </div>
              )}

              {plan.current && (
                <div className="absolute -top-3 right-4">
                  <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                    Current plan
                  </span>
                </div>
              )}

              <CardHeader className="pb-4">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="text-base">
                  {plan.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col space-y-6">
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.priceDescription && (
                      <span className="text-muted-foreground">
                        {plan.priceDescription}
                      </span>
                    )}
                  </div>
                </div>

                <ul className="flex-1 space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check
                        className={cn(
                          'mt-0.5 size-5 shrink-0',
                          plan.highlighted
                            ? 'text-primary'
                            : 'text-muted-foreground',
                        )}
                      />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  className={cn(
                    'w-full',
                    plan.highlighted &&
                      'bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-500 hover:via-purple-500 hover:to-fuchsia-500',
                    plan.current && 'opacity-50 cursor-not-allowed',
                  )}
                  variant={plan.highlighted ? 'default' : 'outline'}
                  disabled={plan.current || checkoutMutation.isPending}
                  onClick={() => handlePlanSelect(plan.id)}
                >
                  {checkoutMutation.isPending
                    ? 'Loading...'
                    : plan.current
                      ? 'Current plan'
                      : plan.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Token Credits Help */}
        <div className="rounded-lg border bg-muted/30 p-6">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <span className="text-xs font-semibold text-primary">i</span>
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="text-sm font-semibold">About token credits</h3>
              <p className="text-sm text-muted-foreground">
                Token credits are token costs passed through by AI providers.
                All Kyoto features use token credits, including vibe checks,
                vibe tests, and Kyoto Stories. Credits are consumed based on
                your usage of AI features.
              </p>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="rounded-lg border bg-muted/50 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            All plans include a 14-day free trial. Cancel anytime.{' '}
            <a
              href="#"
              className="font-medium text-primary underline underline-offset-4 hover:no-underline"
            >
              Learn more
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
