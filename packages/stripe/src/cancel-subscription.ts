import type Stripe from 'stripe'

/**
 * Cancels a Stripe subscription.
 * Silently handles errors if the subscription is already canceled or doesn't exist.
 */
export async function cancelSubscription({
  stripe,
  subscriptionId,
}: {
  stripe: Stripe
  subscriptionId: string
}): Promise<void> {
  try {
    await stripe.subscriptions.cancel(subscriptionId)
  } catch (error) {
    // If subscription is already canceled or doesn't exist, continue
    // eslint-disable-next-line no-console
    console.error('Error canceling Stripe subscription:', error)
  }
}
