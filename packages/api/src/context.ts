import { type ParsedEnv } from '@app/config'
import { type DB, type schema } from '@app/db'

// Placeholder: Define structure based on docs (user object within session)
export interface SessionUser {
  id: string
  // Add other relevant user properties from better-auth if known
}

export interface Session {
  user: SessionUser | null
  // Add other relevant session properties if known
}

export type User = typeof schema.user.$inferSelect

export interface Context {
  db: DB
  env: ParsedEnv
  session: Session | null // Add session to the context
  user: User | null
}
