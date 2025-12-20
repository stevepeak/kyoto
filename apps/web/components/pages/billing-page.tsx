'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { BillingPeriodToggle } from '@/components/billing/billing-period-toggle'
import {
  type BillingPeriod,
  defaultPlans,
  getPlanPrice,
  type Plan,
  type PlanId,
} from '@/components/billing/constants'
import { DowngradeConfirmationDialog } from '@/components/billing/downgrade-confirmation-dialog'
import { PlanCard } from '@/components/billing/plan-card'
import { useTRPC } from '@/lib/trpc-client'

interface BillingPageProps {
  currentPlanId?: PlanId
  onPlanSelect?: (planId: PlanId) => void
}

export function BillingPage({ currentPlanId, onPlanSelect }: BillingPageProps) {
  const trpc = useTRPC()
  const searchParams = useSearchParams()
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly')
  const [showDowngradeDialog, setShowDowngradeDialog] = useState(false)

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
  const cancelMutation = trpc.billing.cancelSubscription.useMutation({
    onSuccess: () => {
      toast.success('Subscription canceled successfully')
      void subscriptionQuery.refetch()
      setShowDowngradeDialog(false)
    },
    onError: (error) => {
      toast.error(`Failed to cancel subscription: ${error.message}`)
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
      // If user is on a paid plan, show confirmation dialog
      if (effectivePlanId !== 'free') {
        setShowDowngradeDialog(true)
        return
      }
      // Already on free plan, no action needed
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

  const handleConfirmDowngrade = () => {
    cancelMutation.mutate()
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
        <BillingPeriodToggle
          billingPeriod={billingPeriod}
          onBillingPeriodChange={setBillingPeriod}
        />

        {/* Pricing Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onSelect={() => handlePlanSelect(plan.id)}
              isPending={checkoutMutation.isPending}
            />
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
            All plans include a 14-day free trial. Cancel anytime.
          </p>
        </div>
      </div>

      {/* Downgrade Confirmation Dialog */}
      <DowngradeConfirmationDialog
        open={showDowngradeDialog}
        onOpenChange={setShowDowngradeDialog}
        onConfirm={handleConfirmDowngrade}
        isPending={cancelMutation.isPending}
      />
    </div>
  )
}
