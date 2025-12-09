import { type DB, eq, schema } from '@app/db'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { type User } from '../context'

/**
 * Retrieves a user by ID
 * @param db - Database instance
 * @param userId - The user ID to retrieve
 * @returns The user if found
 * @throws TRPCError with NOT_FOUND if user doesn't exist
 */
export async function getUser({
  db,
  userId,
}: {
  db: DB
  userId: string
}): Promise<User> {
  const user = await db.query.user.findFirst({
    where: (user, { eq }) => eq(user.id, userId),
  })

  if (!user) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'User not found',
    })
  }

  return user
}

export async function getUserGithubLogin({
  db,
  userId,
}: {
  db: DB
  userId: string
}): Promise<string | null> {
  const githubAccount = await db.query.account.findFirst({
    where: (account, { and, eq }) =>
      and(eq(account.userId, userId), eq(account.providerId, 'github')),
    columns: {
      accountId: true,
      accessToken: true,
    },
  })

  if (!githubAccount?.accountId) {
    return null
  }

  const trimmedAccountId = githubAccount.accountId.trim()

  if (!/^\d+$/.test(trimmedAccountId)) {
    return null
  }

  const externalId = Number.parseInt(trimmedAccountId, 10)

  if (!Number.isFinite(externalId)) {
    return null
  }

  const owner = await db.query.owners.findFirst({
    where: eq(schema.owners.externalId, externalId),
    columns: {
      login: true,
    },
  })

  if (owner?.login) {
    return owner.login
  }

  if (!githubAccount.accessToken) {
    return null
  }

  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${githubAccount.accessToken}`,
        'User-Agent': 'Kyoto',
        Accept: 'application/vnd.github+json',
      },
    })

    if (!response.ok) {
      return null
    }

    const githubUserSchema = z.object({
      login: z.string(),
    })

    const data = githubUserSchema.parse(await response.json())

    return data.login
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to resolve GitHub login via API', error)
    return null
  }
}
