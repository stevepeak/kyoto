import type { Env } from '@app/api'
import { SITE_BASE_URL } from 'astro:env/client'
import {
  GITHUB_APP_ID,
  GITHUB_APP_PRIVATE_KEY,
  OPENROUTER_API_KEY,
} from 'astro:env/server'

export const env: Env = {
  siteBaseUrl: SITE_BASE_URL,
  githubAppId: GITHUB_APP_ID,
  githubAppPrivateKey: GITHUB_APP_PRIVATE_KEY,
  openRouterApiKey: OPENROUTER_API_KEY,
}
