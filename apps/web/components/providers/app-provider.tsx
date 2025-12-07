'use client'

import { useEffect, useState } from 'react'

import { Toaster } from '../ui/sonner'
import { AuthProvider } from './auth-provider'
import { TrpcProvider } from './trpc-provider'

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Only render Toaster after hydration to prevent mismatches
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Client-side mounting pattern for Next.js
    setMounted(true)
  }, [])

  return (
    <TrpcProvider>
      <AuthProvider>
        {children}
        {mounted && <Toaster />}
      </AuthProvider>
    </TrpcProvider>
  )
}
