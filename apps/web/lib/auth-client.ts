'use client'

import { createAuthClient } from 'better-auth/react'

/**
 * Get the app URL for client-side usage.
 * Uses NEXT_PUBLIC_APP_URL if available, otherwise falls back to window.location.origin
 */
function getAppUrl(): string {
  // eslint-disable-next-line no-process-env
  if (process.env.NEXT_PUBLIC_APP_URL) {
    // eslint-disable-next-line no-process-env
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '')
  }
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  // Fallback for SSR
  return 'http://localhost:3000'
}

const authClient = createAuthClient({
  baseURL: getAppUrl(),
})

export const { useSession, signIn, signOut } = authClient
