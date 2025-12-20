import { getConfig } from '@app/config'
import { type DB, eq, schema } from '@app/db'
import { TRPCError } from '@trpc/server'
import Stripe from 'stripe'
import { z } from 'zod'

import { protectedProcedure, router } from '../../trpc'

// Initialize Stripe client
function getStripe() {
  const config = getConfig()
  if (!config.STRIPE_SECRET_KEY) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Stripe is not configured',
    })
  }
  return new Stripe(config.STRIPE_SECRET_KEY, {
    apiVersion: '2025-02-24.acacia',
  })
}

// Map plan IDs and billing periods to Stripe price IDs
// These should be set as environment variables or configured in Stripe Dashboard
// Format: STRIPE_PRICE_ID_{PLAN}_{PERIOD} (e.g., STRIPE_PRICE_ID_PRO_MONTHLY)
function getStripePriceId({
  planId,
  billingPeriod,
}: {
  planId: 'pro' | 'max'
  billingPeriod: 'monthly' | 'annual'
}): string {
  const config = getConfig()
  const envKey =
    `STRIPE_PRICE_ID_${planId.toUpperCase()}_${billingPeriod.toUpperCase()}` as const
  const priceId = config[envKey as keyof typeof config] as string | undefined

  if (!priceId) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `Stripe price ID not configured for ${planId} ${billingPeriod}`,
    })
  }

  return priceId
}

// Get or create Stripe customer for user
async function getOrCreateStripeCustomer({
  db,
  stripe,
  userId,
  email,
  name,
}: {
  db: DB
  stripe: Stripe
  userId: string
  email: string | null
  name: string | null
}): Promise<string> {
  // Check if user already has a subscription with a customer ID
  const existingSubscription = await db.query.subscriptions.findFirst({
    where: eq(schema.subscriptions.userId, userId),
  })

  if (existingSubscription?.stripeCustomerId) {
    return existingSubscription.stripeCustomerId
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email: email ?? undefined,
    name: name ?? undefined,
    metadata: {
      userId,
    },
  })

  // Save customer ID to database (create a subscription record if none exists)
  if (!existingSubscription) {
    await db.insert(schema.subscriptions).values({
      userId,
      stripeCustomerId: customer.id,
      planId: 'free', // Will be updated when subscription is created
      status: 'incomplete',
      billingPeriod: 'monthly',
    })
  } else {
    // Update existing subscription with customer ID
    await db
      .update(schema.subscriptions)
      .set({
        stripeCustomerId: customer.id,
        updatedAt: new Date(),
      })
      .where(eq(schema.subscriptions.userId, userId))
  }

  return customer.id
}

export const billingRouter = router({
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const subscription = await ctx.db.query.subscriptions.findFirst({
      where: eq(schema.subscriptions.userId, ctx.user.id),
    })

    if (!subscription) {
      return {
        planId: 'free' as const,
        status: null,
        billingPeriod: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      }
    }

    return {
      planId: subscription.planId as 'free' | 'pro' | 'max',
      status: subscription.status,
      billingPeriod: subscription.billingPeriod as 'monthly' | 'annual' | null,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd ?? false,
    }
  }),

  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        planId: z.enum(['pro', 'max']),
        billingPeriod: z.enum(['monthly', 'annual']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const stripe = getStripe()
      const config = getConfig()

      if (!config.STRIPE_SECRET_KEY) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Stripe is not configured',
        })
      }

      const { planId, billingPeriod } = input
      const userId = ctx.user.id

      // Get or create Stripe customer
      const customerId = await getOrCreateStripeCustomer({
        db: ctx.db,
        stripe,
        userId,
        email: ctx.user.email,
        name: ctx.user.name,
      })

      // Get Stripe price ID
      const priceId = getStripePriceId({ planId, billingPeriod })

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${config.APP_URL}/billing?success=true`,
        cancel_url: `${config.APP_URL}/billing?canceled=true`,
        subscription_data: {
          metadata: {
            userId,
            planId,
            billingPeriod,
          },
          trial_period_days: 14, // 14-day free trial
        },
        metadata: {
          userId,
          planId,
          billingPeriod,
        },
      })

      return {
        url: session.url,
        sessionId: session.id,
      }
    }),

  cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const stripe = getStripe()
    const userId = ctx.user.id

    // Find user's subscription
    const subscription = await ctx.db.query.subscriptions.findFirst({
      where: eq(schema.subscriptions.userId, userId),
    })

    if (!subscription) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No subscription found',
      })
    }

    // If there's a Stripe subscription, cancel it
    if (subscription.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(subscription.stripeSubscriptionId)
      } catch (error) {
        // If subscription is already canceled or doesn't exist, continue
        // eslint-disable-next-line no-console
        console.error('Error canceling Stripe subscription:', error)
      }
    }

    // Update database to set plan to free
    await ctx.db
      .update(schema.subscriptions)
      .set({
        planId: 'free',
        status: 'canceled',
        updatedAt: new Date(),
      })
      .where(eq(schema.subscriptions.userId, userId))

    return { success: true }
  }),
})
