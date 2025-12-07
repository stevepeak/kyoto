import { type DB, type User } from '@app/db/types'
import { type Kysely, type Selectable, sql } from 'kysely'
import { z } from 'zod'

import { trpcNotFoundError } from './kysely-trprc.js'

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
  db: Kysely<DB>
  userId: string
}): Promise<Selectable<User>> {
  return await db
    .selectFrom('user')
    .where('id', '=', userId)
    .selectAll()
    .executeTakeFirstOrThrow(trpcNotFoundError)
}

export async function getUserGithubLogin({
  db,
  userId,
}: {
  db: Kysely<DB>
  userId: string
}): Promise<string | null> {
  const githubAccount = await db
    .selectFrom('account')
    .select(['accountId', 'accessToken'])
    .where('userId', '=', userId)
    .where('providerId', '=', 'github')
    .executeTakeFirst()

  if (!githubAccount?.accountId) {
    return null
  }

  const trimmedAccountId = githubAccount.accountId.trim()

  if (!/^\d+$/.test(trimmedAccountId)) {
    return null
  }

  const owner = await db
    .selectFrom('owners')
    .select('login')
    .where(
      sql<boolean>`owners.external_id = CAST(${trimmedAccountId} AS bigint)`,
    )
    .executeTakeFirst()

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
