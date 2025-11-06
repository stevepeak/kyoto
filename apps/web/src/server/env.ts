import type { Env } from '@app/api'
import { SITE_BASE_URL } from 'astro:env/client'
import {
  DATABASE_URL,
  GITHUB_APP_ID,
  GITHUB_APP_PRIVATE_KEY,
  OPENROUTER_API_KEY,
} from 'astro:env/server'

// Import TRIGGER_SECRET_KEY with type assertion to handle ambient declaration
// The ambient type declares it as string | undefined, but Env requires string
const triggerSecretKey = (process.env.TRIGGER_SECRET_KEY ?? undefined) as string

export const env: Env = {
  siteBaseUrl: SITE_BASE_URL,
  githubAppId: GITHUB_APP_ID,
  githubAppPrivateKey: GITHUB_APP_PRIVATE_KEY,
  openRouterApiKey: OPENROUTER_API_KEY,
  databaseUrl: DATABASE_URL,
  triggerSecretKey,
}
