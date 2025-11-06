import type { DB } from '@app/db/types'
import type { Kysely } from 'kysely'

export interface SetEnabledReposResult {
  updated: number
}

export async function setEnabledReposStep(params: {
  db: Kysely<DB>
  ownerLogin: string
  repoNames: string[]
}): Promise<SetEnabledReposResult> {
  const { db, ownerLogin, repoNames } = params

  const owner = await db
    .selectFrom('owners')
    .selectAll()
    .where('login', '=', ownerLogin)
    .executeTakeFirst()

  if (!owner) {
    return { updated: 0 }
  }

  // Disable all repos for owner
  await db
    .updateTable('repos')
    .set({ enabled: false })
    .where('ownerId', '=', owner.id)
    .execute()

  if (repoNames.length === 0) {
    return { updated: 0 }
  }

  // Enable selected repos
  const result = await db
    .updateTable('repos')
    .set({ enabled: true })
    .where('ownerId', '=', owner.id)
    .where('name', 'in', repoNames)
    .executeTakeFirst()

  // Kysely's update result does not always have rowCount across drivers; return count conservatively
  return {
    updated: Array.isArray(result)
      ? result.length
      : (result as unknown as { numUpdatedOrDeletedRows?: bigint })
            .numUpdatedOrDeletedRows
        ? Number(
            (result as unknown as { numUpdatedOrDeletedRows: bigint })
              .numUpdatedOrDeletedRows,
          )
        : repoNames.length,
  }
}
