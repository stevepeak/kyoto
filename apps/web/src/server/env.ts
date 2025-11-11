import type { Env } from '@app/api'
import { SITE_BASE_URL } from 'astro:env/client'
import {
  CONTEXT7_API_KEY,
  DATABASE_URL,
  GITHUB_APP_ID,
  GITHUB_APP_PRIVATE_KEY,
  GITHUB_WEBHOOK_SECRET,
  OPENAI_API_KEY,
  TRIGGER_SECRET_KEY,
} from 'astro:env/server'

export const env: Env = {
  siteBaseUrl: SITE_BASE_URL,
  githubAppId: GITHUB_APP_ID,
  githubAppPrivateKey: GITHUB_APP_PRIVATE_KEY,
  githubWebhookSecret: GITHUB_WEBHOOK_SECRET,
  openAiApiKey: OPENAI_API_KEY,
  databaseUrl: DATABASE_URL,
  triggerSecretKey: TRIGGER_SECRET_KEY,
  context7ApiKey: CONTEXT7_API_KEY,
}
