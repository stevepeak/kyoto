import { appRouter, type Context } from '@app/api'
import { getConfig } from '@app/config'

import { getSession } from '@/lib/auth-server'
import { db } from '@/lib/db'

export async function createContext(): Promise<Context> {
  const env = getConfig()

  const session = await getSession()

  let user = null
  if (session?.user?.id) {
    // Query user from database using Drizzle
    const users = await db.query.user.findMany({
      where: (user, { eq }) => eq(user.id, session.user.id),
      limit: 1,
    })
    user = users[0] ?? null
  }

  return {
    // Cast the Drizzle db to Kysely for API compatibility
    // This is a temporary workaround until we unify the database layer
    db: db as unknown as Context['db'],
    env,
    session: session
      ? {
          user: session.user
            ? {
                id: session.user.id,
              }
            : null,
        }
      : null,
    user,
  }
}

export { appRouter }
