import { getConfig } from '@app/config'
import { type DB, eq, schema } from '@app/db'
import { OpenRouter } from '@openrouter/sdk'

/**
 * Spend limits per plan per month
 */
const PLAN_SPEND_LIMITS: Record<'free' | 'pro' | 'max', number> = {
  free: 3,
  pro: 12,
  max: 45,
}

/**
 * Updates the OpenRouter spend limit for a user based on their plan.
 * Ensures the user has an OpenRouter API key before updating.
 */
export async function updateOpenRouterSpendLimit({
  db,
  userId,
  planId,
}: {
  db: DB
  userId: string
  planId: 'free' | 'pro' | 'max'
}): Promise<void> {
  const user = await db.query.user.findFirst({
    where: eq(schema.user.id, userId),
    columns: {
      id: true,
      openrouterApiKey: true,
    },
  })

  if (!user) {
    // eslint-disable-next-line no-console
    console.warn(
      `User ${userId} not found when updating OpenRouter spend limit`,
    )
    return
  }

  // If user doesn't have an API key yet, they'll get one when they first use the service
  // We don't create it here to avoid unnecessary API key creation
  if (!user.openrouterApiKey) {
    // eslint-disable-next-line no-console
    console.log(
      `User ${userId} doesn't have OpenRouter API key yet, skipping limit update`,
    )
    return
  }

  const limit = PLAN_SPEND_LIMITS[planId]

  // Get provisioning key from config
  const config = getConfig()
  const provisioningKey = config.OPENROUTER_PROVISION_KEY

  if (!provisioningKey) {
    // eslint-disable-next-line no-console
    console.error(
      'OpenRouter provisioning key not configured, cannot update spend limit',
    )
    return
  }

  try {
    // Initialize OpenRouter SDK with provisioning key
    const openRouter = new OpenRouter({
      apiKey: provisioningKey,
    })

    // Update API key limit
    // The hash parameter is the API key itself
    await openRouter.apiKeys.update({
      hash: user.openrouterApiKey,
      requestBody: {
        limit,
        limitReset: 'monthly',
      },
    })

    // eslint-disable-next-line no-console
    console.log(
      `Updated OpenRouter spend limit for user ${userId} to $${limit}/month (plan: ${planId})`,
    )
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(
      `Failed to update OpenRouter spend limit for user ${userId}:`,
      error instanceof Error ? error.message : error,
    )
    // Don't throw - we don't want to break the subscription flow if limit update fails
  }
}
