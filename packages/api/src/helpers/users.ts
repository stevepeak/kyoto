import type { DB, User } from '@app/db/types'
import type { Kysely, Selectable, Updateable } from 'kysely'

import { trpcNotFoundError } from './kysely-trprc'

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
    .selectFrom('users')
    .where('id', '=', userId)
    .selectAll()
    .executeTakeFirstOrThrow(trpcNotFoundError)
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
  db: Kysely<DB>
  userId: string
  values: Partial<Updateable<User>>
}): Promise<Selectable<User>> {
  return await db
    .updateTable('users')
    .set(values)
    .where('id', '=', userId)
    .returningAll()
    .executeTakeFirstOrThrow(trpcNotFoundError)
}
