import { createAuthClient } from 'better-auth/react'

function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  // Server-side: use environment variable or default
  if (process.env.SITE_PRODUCTION_URL) {
    return `https://${process.env.SITE_PRODUCTION_URL}`
  }
  if (process.env.SITE_PREVIEW_BRANCH_URL) {
    return `https://${process.env.SITE_PREVIEW_BRANCH_URL}`
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return 'http://localhost:3001'
}

const BASE_URL = getBaseUrl()

const authClient = createAuthClient({
  baseURL: BASE_URL,
})

export const { signIn, signOut, useSession } = authClient
