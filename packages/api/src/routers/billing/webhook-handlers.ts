import { type DB, eq, schema } from '@app/db'
import { type Stripe } from 'stripe'

import { normalizePlanId, updateUserPlanAndSpendLimit } from './utils'

export async function handleSubscriptionCreated({
  db,
  stripe,
  subscription,
  customerId,
  userId,
}: {
  db: DB
  stripe: Stripe
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

  const normalizedPlanId = normalizePlanId(planId)

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

  await updateUserPlanAndSpendLimit({
    db,
    userId,
    planId: normalizedPlanId,
  })
}

export async function handleSubscriptionUpdated({
  db,
  stripe,
  subscription,
}: {
  db: DB
  stripe: Stripe
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
          db,
          stripe,
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

  const normalizedPlanId = normalizePlanId(planId)

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

  await updateUserPlanAndSpendLimit({
    db,
    userId: existing.userId,
    planId: normalizedPlanId,
  })
}

export async function handleSubscriptionDeleted({
  db,
  subscription,
}: {
  db: DB
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

  await updateUserPlanAndSpendLimit({
    db,
    userId: existing.userId,
    planId: 'free',
  })
}
