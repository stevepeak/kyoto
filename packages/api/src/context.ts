import type { DB, User } from '@app/db/types'

// Placeholder: Define structure based on docs (user object within session)
export interface SessionUser {
  id: string
  // Add other relevant user properties from better-auth if known
}

export interface Session {
  user: SessionUser | null
  // Add other relevant session properties if known
}

// Env, used by TRPC to pass env variables along
export interface Env {
  siteBaseUrl: string
  githubAppId: string
  githubAppPrivateKey: string
  githubWebhookSecret: string
  openAiApiKey: string
  databaseUrl: string
  triggerSecretKey: string
  context7ApiKey: string | undefined
}

export interface Context {
  db: DB
  env: Env
  session: Session | null // Add session to the context
  user: User | null
}
