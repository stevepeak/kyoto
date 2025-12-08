'use client'

import * as Sentry from '@sentry/nextjs'
import React, { useEffect } from 'react'

import { useSession } from '@/client/auth-client'

interface AuthProviderProps {
  children: React.ReactNode
}

/**
 * AuthProvider now only handles Sentry user tracking.
 * Authentication redirects are handled by Next.js middleware.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const session = useSession()
  const sessionUser = session.data?.user ?? null

  useEffect(() => {
    if (session.isPending) {
      return
    }

    if (session.error || !sessionUser) {
      Sentry.setUser(null)
      return
    }

    Sentry.setUser({
      id: sessionUser.id,
      email: sessionUser.email ?? undefined,
      username: sessionUser.name ?? undefined,
    })
  }, [sessionUser, session.error, session.isPending])

  return <>{children}</>
}
