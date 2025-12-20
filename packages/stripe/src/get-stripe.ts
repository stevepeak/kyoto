import { getConfig } from '@app/config'
import { TRPCError } from '@trpc/server'
import Stripe from 'stripe'

/**
 * Initialize and return a Stripe client instance.
 * Throws an error if Stripe is not configured.
 */
export function getStripe(): Stripe {
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
