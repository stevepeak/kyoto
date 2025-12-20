import type Stripe from 'stripe'

import {
  handleSubscriptionCreated,
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
} from '@app/api'
import { getConfig } from '@app/config'
import { getStripe } from '@app/stripe'
import { type NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'

export const runtime = 'nodejs'

const stripe = getStripe()

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
            db,
            stripe,
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
        await handleSubscriptionUpdated({ db, stripe, subscription })
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted({ db, subscription })
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
          await handleSubscriptionUpdated({ db, stripe, subscription })
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
          await handleSubscriptionUpdated({ db, stripe, subscription })
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
