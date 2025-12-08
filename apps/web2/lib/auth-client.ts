'use client'

import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  // eslint-disable-next-line no-process-env
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
})

export const { useSession, signIn, signOut } = authClient
