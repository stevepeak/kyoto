import { getConfig } from '@app/config'
import { eq, schema } from '@app/db'
import { updateOpenRouterSpendLimit } from '@app/openrouter'
import { type NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

import { db } from '@/lib/db'

export const runtime = 'nodejs'

const stripe = new Stripe(getConfig().STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2025-02-24.acacia',
})

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 },
    )
  }

  const webhookSecret = getConfig().STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'Stripe webhook secret not configured' },
      { status: 500 },
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error'
    // eslint-disable-next-line no-console
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json(
      { error: `Webhook Error: ${error}` },
      { status: 400 },
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string,
          )

          await handleSubscriptionCreated({
            subscription,
            customerId: subscription.customer as string,
            userId: session.metadata?.userId,
          })
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated({ subscription })
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted({ subscription })
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.subscription) {
          const subscriptionId =
            typeof invoice.subscription === 'string'
              ? invoice.subscription
              : invoice.subscription.id
          const subscription =
            await stripe.subscriptions.retrieve(subscriptionId)
          await handleSubscriptionUpdated({ subscription })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.subscription) {
          const subscriptionId =
            typeof invoice.subscription === 'string'
              ? invoice.subscription
              : invoice.subscription.id
          const subscription =
            await stripe.subscriptions.retrieve(subscriptionId)
          await handleSubscriptionUpdated({ subscription })
        }
        break
      }

      default:
        // eslint-disable-next-line no-console
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 },
    )
  }
}

async function handleSubscriptionCreated({
  subscription,
  customerId,
  userId,
}: {
  subscription: Stripe.Subscription
  customerId: string
  userId?: string
}) {
  if (!userId) {
    // Try to get userId from customer metadata
    const customer = await stripe.customers.retrieve(customerId)
    if (typeof customer !== 'string' && !customer.deleted) {
      userId = customer.metadata?.userId
    }
  }

  if (!userId) {
    throw new Error('User ID not found in subscription metadata')
  }

  const planId = subscription.metadata?.planId ?? 'pro'
  const billingPeriod = subscription.metadata?.billingPeriod ?? 'monthly'

  // Check if subscription already exists by user ID or subscription ID
  const existing = await db.query.subscriptions.findFirst({
    where: eq(schema.subscriptions.userId, userId),
  })

  const existingBySubscriptionId = await db.query.subscriptions.findFirst({
    where: eq(schema.subscriptions.stripeSubscriptionId, subscription.id),
  })

  if (existingBySubscriptionId && existingBySubscriptionId.userId !== userId) {
    // eslint-disable-next-line no-console
    console.warn(
      `Subscription ${subscription.id} already exists for different user`,
    )
    return
  }

  // Normalize planId to match user plan enum
  const normalizedPlanId =
    planId === 'free' || planId === 'pro' || planId === 'max'
      ? (planId as 'free' | 'pro' | 'max')
      : ('pro' as const)

  if (existing) {
    // Update existing subscription
    await db
      .update(schema.subscriptions)
      .set({
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        planId: normalizedPlanId,
        status: subscription.status,
        billingPeriod,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
        updatedAt: new Date(),
      })
      .where(eq(schema.subscriptions.userId, userId))
  } else {
    // Create new subscription
    await db.insert(schema.subscriptions).values({
      userId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      planId: normalizedPlanId,
      status: subscription.status,
      billingPeriod,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
    })
  }

  // Update user plan and OpenRouter spend limit
  await db
    .update(schema.user)
    .set({
      plan: normalizedPlanId,
      updatedAt: new Date(),
    })
    .where(eq(schema.user.id, userId))

  await updateOpenRouterSpendLimit({
    db,
    userId,
    planId: normalizedPlanId,
  })
}

async function handleSubscriptionUpdated({
  subscription,
}: {
  subscription: Stripe.Subscription
}) {
  const existing = await db.query.subscriptions.findFirst({
    where: eq(schema.subscriptions.stripeSubscriptionId, subscription.id),
  })

  if (!existing) {
    // Try to find by customer ID
    const customerId = subscription.customer as string
    const customer = await stripe.customers.retrieve(customerId)
    if (typeof customer !== 'string' && !customer.deleted) {
      const userId = customer.metadata?.userId
      if (userId) {
        await handleSubscriptionCreated({
          subscription,
          customerId,
          userId,
        })
        return
      }
    }
    // eslint-disable-next-line no-console
    console.warn(`Subscription ${subscription.id} not found in database`)
    return
  }

  // Get plan and billing period from subscription metadata or existing record
  // Also try to get from price/item metadata if available
  const planId = subscription.metadata?.planId ?? existing.planId
  const billingPeriod =
    subscription.metadata?.billingPeriod ?? existing.billingPeriod

  // Normalize planId to match user plan enum
  const normalizedPlanId =
    planId === 'free' || planId === 'pro' || planId === 'max'
      ? (planId as 'free' | 'pro' | 'max')
      : ('pro' as const)

  await db
    .update(schema.subscriptions)
    .set({
      planId: normalizedPlanId,
      status: subscription.status,
      billingPeriod,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
      updatedAt: new Date(),
    })
    .where(eq(schema.subscriptions.stripeSubscriptionId, subscription.id))

  // Update user plan and OpenRouter spend limit
  await db
    .update(schema.user)
    .set({
      plan: normalizedPlanId,
      updatedAt: new Date(),
    })
    .where(eq(schema.user.id, existing.userId))

  await updateOpenRouterSpendLimit({
    db,
    userId: existing.userId,
    planId: normalizedPlanId,
  })
}

async function handleSubscriptionDeleted({
  subscription,
}: {
  subscription: Stripe.Subscription
}) {
  const existing = await db.query.subscriptions.findFirst({
    where: eq(schema.subscriptions.stripeSubscriptionId, subscription.id),
  })

  if (!existing) {
    // eslint-disable-next-line no-console
    console.warn(`Subscription ${subscription.id} not found when deleting`)
    return
  }

  await db
    .update(schema.subscriptions)
    .set({
      status: 'canceled',
      updatedAt: new Date(),
    })
    .where(eq(schema.subscriptions.stripeSubscriptionId, subscription.id))

  // When subscription is deleted, user goes back to free plan
  await db
    .update(schema.user)
    .set({
      plan: 'free',
      updatedAt: new Date(),
    })
    .where(eq(schema.user.id, existing.userId))

  await updateOpenRouterSpendLimit({
    db,
    userId: existing.userId,
    planId: 'free',
  })
}
