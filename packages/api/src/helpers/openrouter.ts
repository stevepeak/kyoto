import { getConfig } from '@app/config'
import { type DB, eq, schema } from '@app/db'
import { OpenRouter } from '@openrouter/sdk'
import { TRPCError } from '@trpc/server'

/**
 * Generates an OpenRouter API key for a user using the provisioning SDK.
 * If the user already has a key, returns the existing key.
 * Otherwise, creates a new key with $1/month budget.
 */
export async function ensureOpenRouterApiKey({
  db,
  userId,
}: {
  db: DB
  userId: string
}): Promise<string> {
  // Check if user already has an API key
  const user = await db.query.user.findFirst({
    where: eq(schema.user.id, userId),
    columns: {
      id: true,
      login: true,
      openrouterApiKey: true,
    },
  })

  if (!user) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'User not found',
    })
  }

  // Return existing key if present
  if (user.openrouterApiKey) {
    return user.openrouterApiKey
  }

  // Get provisioning key from config
  const config = getConfig()
  const provisioningKey = config.OPENROUTER_PROVISION_KEY

  if (!provisioningKey) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'OpenRouter provisioning key not configured',
    })
  }

  try {
    // Initialize OpenRouter SDK with provisioning key
    const openRouter = new OpenRouter({
      apiKey: provisioningKey,
    })

    // Create new API key
    const newKey = await openRouter.apiKeys.create({
      name: `User-${user.login}-${userId}`,
      limit: 1, // $1 budget
      limitReset: 'monthly',
    })

    const apiKey = newKey.key

    if (!apiKey) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate OpenRouter API key',
      })
    }

    // Store the key in the database
    await db
      .update(schema.user)
      .set({
        openrouterApiKey: apiKey,
        updatedAt: new Date(),
      })
      .where(eq(schema.user.id, userId))

    return apiKey
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to generate OpenRouter API key:', error)

    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message:
        error instanceof Error
          ? `Failed to generate API key: ${error.message}`
          : 'Failed to generate OpenRouter API key',
    })
  }
}
