import { getConfig } from '@app/config'
import { type DB, eq, schema } from '@app/db'
import { OpenRouter } from '@openrouter/sdk'
import { TRPCError } from '@trpc/server'

/**
 * Gets the OpenRouter API key for a user from the database.
 * Returns null if the user doesn't exist or doesn't have a key.
 */
export async function getUserOpenrouterApiKey({
  db,
  userId,
}: {
  db: DB
  userId: string
}): Promise<string | null> {
  const user = await db.query.user.findFirst({
    where: eq(schema.user.id, userId),
    columns: {
      id: true,
      openrouterApiKey: true,
    },
  })

  return user?.openrouterApiKey ?? null
}

/**
 * Gets an OpenRouter client initialized with the provisioning key.
 * Throws if the provisioning key is not configured.
 */
export function getProvisioningOpenRouterClient(): OpenRouter {
  const config = getConfig()
  const provisioningKey = config.OPENROUTER_PROVISION_KEY

  if (!provisioningKey) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'OpenRouter provisioning key not configured',
    })
  }

  return new OpenRouter({
    apiKey: provisioningKey,
  })
}
