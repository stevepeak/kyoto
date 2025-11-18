import type { DB, User } from '@app/db/types'
import { sql, eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { users, accounts, owners } from '@app/db/schema'

import { trpcNotFoundError } from './trpc-helpers'

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
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!result[0]) {
    throw trpcNotFoundError()
  }

  return result[0]
}

/**
 * Updates a user's details
 * @param db - Database instance
 * @param userId - The user ID to update
 * @param values - The values to update
 * @returns The updated user
 * @throws TRPCError with NOT_FOUND if user doesn't exist
 */
export async function updateUser({
  db,
  userId,
  values,
}: {
  db: DB
  userId: string
  values: Partial<User>
}): Promise<User> {
  const result = await db
    .update(users)
    .set(values)
    .where(eq(users.id, userId))
    .returning()

  if (!result[0]) {
    throw trpcNotFoundError()
  }

  return result[0]
}

export async function getUserGithubLogin({
  db,
  userId,
}: {
  db: DB
  userId: string
}): Promise<string | null> {
  const githubAccount = await db
    .select({
      accountId: accounts.accountId,
      accessToken: accounts.accessToken,
    })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.providerId, 'github')))
    .limit(1)

  if (!githubAccount[0]?.accountId) {
    return null
  }

  const trimmedAccountId = githubAccount[0].accountId.trim()

  if (!/^\d+$/.test(trimmedAccountId)) {
    return null
  }

  const owner = await db
    .select({ login: owners.login })
    .from(owners)
    .where(sql`${owners.externalId} = CAST(${trimmedAccountId} AS bigint)`)
    .limit(1)

  if (owner[0]?.login) {
    return owner[0].login
  }

  if (!githubAccount[0].accessToken) {
    return null
  }

  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${githubAccount[0].accessToken}`,
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
    console.error('Failed to resolve GitHub login via API', error)
    return null
  }
}
